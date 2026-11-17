import { requireOfficer } from '@/lib/dashboard/dal'

import type { AlbumRow, DocumentRow, FormResponseRow, FormRow, OpportunityRow, PollResponseRow, PollResults, PollRow, TestimonialRow, TourRow } from './types'

/**
 * What the dashboard reads of the smaller kinds of content: everything, shown or not, as the
 * officer asking. Each reads as empty before its migration has run, so the screen still opens.
 */

const rows = <T>(result: { data: T[] | null; error: unknown }): T[] => (result.error ? [] : (result.data ?? []))

export async function listAlbums(): Promise<AlbumRow[]> {
  const { supabase } = await requireOfficer()
  return rows(await supabase.from('albums').select('*').order('taken_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }))
}

export async function listTours(): Promise<TourRow[]> {
  const { supabase } = await requireOfficer()
  return rows(await supabase.from('tours').select('*').order('sort').order('title'))
}

export async function listDocuments(): Promise<DocumentRow[]> {
  const { supabase } = await requireOfficer()
  return rows(await supabase.from('documents').select('*').order('category').order('sort').order('title'))
}

export async function listTestimonials(): Promise<TestimonialRow[]> {
  const { supabase } = await requireOfficer()
  return rows(await supabase.from('testimonials').select('*').order('sort').order('name'))
}

export async function listOpportunities(): Promise<OpportunityRow[]> {
  const { supabase } = await requireOfficer()
  return rows(await supabase.from('opportunities').select('*').order('deadline', { ascending: true, nullsFirst: false }).order('title'))
}

/** Polls and quizzes, each with its right answers (a quiz's) and how many have answered */
export async function listPolls(): Promise<(PollRow & { correct: Record<string, string>; responses: number })[]> {
  const { supabase } = await requireOfficer()
  const [polls, keys, answered] = await Promise.all([
    supabase.from('polls').select('*').order('created_at', { ascending: false }),
    supabase.from('poll_keys').select('*'),
    supabase.from('poll_responses').select('poll_id'),
  ])
  const keyOf = new Map(rows(keys).map((k) => [k.poll_id, k.correct]))
  const count = new Map<string, number>()
  for (const r of rows(answered)) count.set(r.poll_id, (count.get(r.poll_id) ?? 0) + 1)
  return rows(polls).map((p) => ({ ...p, correct: keyOf.get(p.id) ?? {}, responses: count.get(p.id) ?? 0 }))
}

/** One poll or quiz with its right answers, how everyone answered, and each answer; null if there's no such one */
export async function getPollWithAnswers(id: string) {
  const { supabase } = await requireOfficer()
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data: poll } = await supabase.from('polls').select('*').eq('id', id).maybeSingle()
  if (!poll) return null
  const [key, results, responses] = await Promise.all([
    supabase.from('poll_keys').select('correct').eq('poll_id', id).maybeSingle(),
    supabase.rpc('poll_results', { p_poll: id }),
    supabase.from('poll_responses').select('*').eq('poll_id', id).order('created_at', { ascending: false }),
  ])
  return {
    poll: poll as PollRow,
    correct: key.data?.correct ?? {},
    results: ((results.data as PollResults | null) ?? { total: 0, counts: {} }) as PollResults,
    responses: rows(responses) as PollResponseRow[],
  }
}

/** Forms, each with how many have answered */
export async function listForms(): Promise<(FormRow & { responses: number })[]> {
  const { supabase } = await requireOfficer()
  const [forms, answered] = await Promise.all([supabase.from('forms').select('*').order('created_at', { ascending: false }), supabase.from('form_responses').select('form_id')])
  const count = new Map<string, number>()
  for (const r of rows(answered)) count.set(r.form_id, (count.get(r.form_id) ?? 0) + 1)
  return rows(forms).map((f) => ({ ...f, responses: count.get(f.id) ?? 0 }))
}

/** One form and what's been sent to it, newest first; null if there's no such form */
export async function getFormWithResponses(id: string): Promise<{ form: FormRow; responses: FormResponseRow[] } | null> {
  const { supabase } = await requireOfficer()
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data: form } = await supabase.from('forms').select('*').eq('id', id).maybeSingle()
  if (!form) return null
  return { form, responses: rows(await supabase.from('form_responses').select('*').eq('form_id', id).order('created_at', { ascending: false })) }
}
