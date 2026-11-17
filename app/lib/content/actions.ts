'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { requireOfficer } from '@/lib/dashboard/dal'
import type { ActionResult } from '@/lib/dashboard/validate'
import { TOURS } from '@/lib/data/tour'
import { createPublicClient } from '@/lib/supabase/server'

import { CONTENT_TABLES, isOpen, type ContentKind, type FormRow, type PollResults, type PollRow } from './types'
import { parseContent, parseFormAnswers, parsePollAnswers } from './validate'

/**
 * Saving the dashboard's smaller kinds of content (albums, tours, the library, testimonials,
 * opportunities, polls and quizzes, forms), and taking what visitors send to a poll or a
 * form. Officers' changes are checked, written as that officer (so row-level security
 * applies), noted in the activity feed, and refresh the site.
 */

const NOUNS: Record<ContentKind, string> = { album: 'album', tour: 'tour', document: 'document', testimonial: 'testimonial', opportunity: 'opportunity', poll: 'poll', form: 'form' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isKind = (kind: string): kind is ContentKind => Object.hasOwn(CONTENT_TABLES, kind)

const failure = (error: { code?: string; message: string }): ActionResult => {
  if (error.code === '23505') return { ok: false, errors: { slug: 'Something else already uses that web address.' } }
  if (error.code === '42501') return { ok: false, error: 'You don’t have permission to do that.' }
  if (error.code === '42P01' || error.code === 'PGRST205') return { ok: false, error: 'This isn’t set up yet: its database migration hasn’t been run.' }
  return { ok: false, error: error.message }
}

type Supabase = Awaited<ReturnType<typeof requireOfficer>>['supabase']
const log = (supabase: Supabase, action: string, subject?: string | null) => supabase.from('activity').insert({ action, subject: subject ?? null })
const refresh = () => revalidatePath('/', 'layout')

/** Adds one (no id) or changes one, of any of the kinds */
export async function saveContent(kind: ContentKind, id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  if (!isKind(kind) || (id !== null && !UUID.test(id))) return { ok: false, error: 'Couldn’t tell what to save. Reload and try again.' }
  const parsed = parseContent(kind, form)
  if (!parsed.ok) return parsed
  const { row, correct } = parsed.data
  // The tables share nothing but their shape here, so the client's per-table types are set aside
  const table = supabase.from(CONTENT_TABLES[kind] as 'albums')
  const { data, error } = id ? await table.update(row as never).eq('id', id).select('id').maybeSingle() : await table.insert(row as never).select('id').single()
  if (error) return failure(error)
  if (!data) return { ok: false, error: `That ${NOUNS[kind]} is gone; it may have been removed.` }
  // A quiz's right answers live apart from it, where only officers can read them
  if (kind === 'poll') {
    const keyed = await supabase.from('poll_keys').upsert({ poll_id: data.id, correct: correct ?? {} })
    if (keyed.error) return failure(keyed.error)
  }
  const name = typeof row.title === 'string' ? row.title : typeof row.name === 'string' ? row.name : null
  await log(supabase, id ? `updated ${NOUNS[kind]}` : `added ${NOUNS[kind]}`, name)
  refresh()
  return { ok: true, id: data.id, message: row.published === false ? 'Saved (not shown on the site)' : 'Saved' }
}

export async function deleteContent(kind: ContentKind, id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  if (!isKind(kind) || !UUID.test(id)) return { ok: false, error: 'Couldn’t tell what to remove.' }
  const { error } = await supabase.from(CONTENT_TABLES[kind] as 'albums').delete().eq('id', id)
  if (error) return failure(error)
  await log(supabase, `removed ${NOUNS[kind]}`)
  refresh()
  return { ok: true }
}

/** Copies the tours built into the site into the dashboard, to change from there. Ones already copied are left alone. */
export async function importBuiltInTours(): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data: existing, error } = await supabase.from('tours').select('slug')
  if (error) return failure(error)
  const have = new Set(existing.map((t) => t.slug))
  const rows = TOURS.filter((t) => !have.has(t.id)).map((t, i) => ({
    slug: t.id,
    title: t.title,
    label: t.label,
    intro: t.intro,
    stops: t.stops.map((s) => ({ placeId: s.placeId, title: s.title, why: s.why, tip: s.tip ?? '' })),
    sort: (have.size + i + 1) * 10,
    published: true,
  }))
  if (!rows.length) return { ok: true, message: 'They’re all here already' }
  const added = await supabase.from('tours').insert(rows)
  if (added.error) return failure(added.error)
  await log(supabase, 'copied in the built-in tours')
  refresh()
  return { ok: true, message: `Copied ${rows.length} ${rows.length === 1 ? 'tour' : 'tours'}` }
}

// ── Answers: polls, quizzes, and forms ──────────────────────────────────────

const VOTER_COOKIE = 'cseg_voter'

/** This browser's token for polls: made the first time it answers one, and kept a year */
const voterToken = async () => {
  const jar = await cookies()
  const had = jar.get(VOTER_COOKIE)?.value
  if (had && /^[\w-]{16,64}$/.test(had)) return had
  const token = crypto.randomUUID()
  jar.set(VOTER_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 365, path: '/' })
  return token
}

export type PollOutcome = { ok: true; score: number | null; correct: Record<string, string> | null; results: PollResults | null } | { ok: false; error?: string; errors?: Record<string, string> }

/** A visitor's answer to a poll or quiz: once per browser. A quiz comes back marked, with the right answers. */
export async function submitPoll(pollId: string, form: FormData): Promise<PollOutcome> {
  const supabase = createPublicClient()
  if (!supabase || !UUID.test(pollId)) return { ok: false, error: 'Answers can’t be taken from here right now.' }
  const { data: poll } = await supabase.from('polls').select('*').eq('id', pollId).eq('published', true).maybeSingle<PollRow>()
  if (!poll) return { ok: false, error: 'That isn’t open.' }
  if (!isOpen(poll)) return { ok: false, error: 'This has closed.' }
  const parsed = parsePollAnswers(poll.questions, form)
  if (!parsed.ok) return parsed
  const { data, error } = await supabase.rpc('submit_poll_response', { p_poll: pollId, p_voter: await voterToken(), p_answers: parsed.data })
  if (error) return { ok: false, error: error.code === 'P0001' ? error.message : 'Your answer didn’t go through.' }
  const marked = (data ?? {}) as { score?: number | null; correct?: Record<string, string> | null }
  const { data: results } = poll.results_public ? await supabase.rpc('poll_results', { p_poll: pollId }) : { data: null }
  revalidatePath('/dashboard', 'layout')
  return { ok: true, score: marked.score ?? null, correct: poll.kind === 'quiz' ? (marked.correct ?? {}) : null, results: (results as PollResults | null) ?? null }
}

/** What a visitor sent to a form officers built */
export async function submitForm(formId: string, form: FormData): Promise<ActionResult> {
  // People never see this field; bots fill it in
  if (typeof form.get('website') === 'string' && form.get('website') !== '') return { ok: true }
  const supabase = createPublicClient()
  if (!supabase || !UUID.test(formId)) return { ok: false, error: 'This can’t be sent from here right now.' }
  const { data: definition } = await supabase.from('forms').select('*').eq('id', formId).eq('published', true).maybeSingle<FormRow>()
  if (!definition) return { ok: false, error: 'That form isn’t open.' }
  if (!isOpen(definition)) return { ok: false, error: 'This form has closed.' }
  const parsed = parseFormAnswers(definition.fields, form)
  if (!parsed.ok) return parsed
  if (!Object.keys(parsed.data).length) return { ok: false, error: 'Fill something in first.' }
  const { error } = await supabase.from('form_responses').insert({ form_id: formId, answers: parsed.data })
  if (error) return { ok: false, error: 'That didn’t go through.' }
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: definition.success_message ?? undefined }
}

/** Removes responses to a form */
export async function deleteFormResponses(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const clean = ids.filter((i) => UUID.test(i))
  if (!clean.length) return { ok: true }
  const { error } = await supabase.from('form_responses').delete().in('id', clean)
  if (error) return failure(error)
  await log(supabase, 'removed', `${clean.length} form ${clean.length === 1 ? 'response' : 'responses'}`)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

/** Clears every answer to a poll or quiz, to start it over */
export async function clearPollResponses(pollId: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  if (!UUID.test(pollId)) return { ok: false, error: 'Couldn’t tell which poll.' }
  const { error } = await supabase.from('poll_responses').delete().eq('poll_id', pollId)
  if (error) return failure(error)
  await log(supabase, 'cleared the answers to a poll')
  refresh()
  return { ok: true, message: 'Answers cleared' }
}
