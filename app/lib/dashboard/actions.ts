'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { isSitePage, pageHref } from '@/lib/sitePages'

import { requireAdmin, requireOfficer } from './dal'
import { parseCheckin, parseDocument, parseEatery, parseMember, parseOfficer, parsePlace, parseSettings, type ActionResult } from './validate'

/**
 * Everything the dashboard changes. Each action checks who's asking first (the data
 * access layer), validates what was typed, writes as that officer (so row-level security
 * applies), notes it in the activity feed, and refreshes the pages that show it.
 */

type Supabase = Awaited<ReturnType<typeof requireOfficer>>['supabase']

/** Postgres's error codes, said in words */
const failure = (error: { code?: string; message: string }, what = 'That'): ActionResult => {
  if (error.code === '23505') return { ok: false, error: `${what} is already taken.` }
  if (error.code === '42501') return { ok: false, error: 'You don’t have permission to do that.' }
  return { ok: false, error: error.message }
}

const log = async (supabase: Supabase, action: string, subject?: string) => {
  // The feed is a nicety: a failed note shouldn't fail the change itself
  await supabase.from('activity').insert({ action, subject: subject ?? null })
}

// ── Members ─────────────────────────────────────────────────────────────────

export async function saveMember(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parseMember(form)
  if (!parsed.ok) return parsed
  const { data, error } = id
    ? await supabase.from('members').update(parsed.data).eq('id', id).select('id').single()
    : await supabase.from('members').insert(parsed.data).select('id').single()
  if (error) return failure(error, 'That email')
  await log(supabase, id ? 'updated member' : 'added member', parsed.data.name)
  revalidatePath('/dashboard', 'layout')
  return { ok: true, id: data.id, message: id ? 'Saved' : `Added ${parsed.data.name}` }
}

export async function setMemberStatus(ids: string[], status: 'active' | 'new' | 'inactive'): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { error } = await supabase.from('members').update({ status }).in('id', ids)
  if (error) return failure(error)
  await log(supabase, `marked ${status}`, `${ids.length} member${ids.length === 1 ? '' : 's'}`)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

export async function removeMembers(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { error } = await supabase.from('members').delete().in('id', ids)
  if (error) return failure(error)
  await log(supabase, 'removed', `${ids.length} member${ids.length === 1 ? '' : 's'}`)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

// ── Check-ins ───────────────────────────────────────────────────────────────

export async function checkIn(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parseCheckin(form)
  if (!parsed.ok) return parsed
  const { error } = await supabase.from('event_checkins').insert(parsed.data)
  if (error) return error.code === '23505' ? { ok: false, error: `${parsed.data.name} is already checked in.` } : failure(error)
  await log(supabase, 'checked in', parsed.data.name)
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: `Checked in ${parsed.data.name}` }
}

export async function undoCheckIn(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { error } = await supabase.from('event_checkins').delete().eq('id', id)
  if (error) return failure(error)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

// ── Posts and pages ─────────────────────────────────────────────────────────

export async function savePost(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parseDocument(form)
  if (!parsed.ok) return parsed
  const { title, slug, status, body, excerpt, cover_image_url } = parsed.data
  const row = { title, slug, status, body, excerpt, cover_image_url }
  // Dated when first published; a post taken down and put back up keeps its first date
  let publishedAt: string | null | undefined
  if (status === 'published') {
    const existing = id ? (await supabase.from('posts').select('published_at').eq('id', id).maybeSingle()).data : null
    publishedAt = existing?.published_at ?? new Date().toISOString()
  }
  const values = publishedAt ? { ...row, published_at: publishedAt } : row
  const { data, error } = id
    ? await supabase.from('posts').update(values).eq('id', id).select('id').single()
    : await supabase.from('posts').insert(values).select('id').single()
  if (error) return failure(error, 'That web address')
  await log(supabase, id ? (status === 'published' ? 'updated post' : 'saved draft') : 'wrote post', title)
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/posts', 'layout')
  return { ok: true, id: data.id, message: status === 'published' ? 'Published' : 'Draft saved' }
}

export async function deletePost(id: string): Promise<void> {
  const { supabase } = await requireOfficer()
  const { data } = await supabase.from('posts').delete().eq('id', id).select('title').maybeSingle()
  await log(supabase, 'deleted post', data?.title)
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/posts', 'layout')
  redirect('/dashboard/posts')
}

export async function savePage(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parseDocument(form)
  if (!parsed.ok) return parsed
  const { title, slug, status, body, description, subtitle, layout, sections } = parsed.data
  const values = { title, slug, status, body, description, subtitle, layout, sections }
  const { data, error } = id
    ? await supabase.from('pages').update(values).eq('id', id).select('id').single()
    : await supabase.from('pages').insert(values).select('id').single()
  if (error) return failure(error, 'That web address')
  await log(supabase, id ? 'updated page' : 'created page', title)
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/pages', 'layout')
  // A site page (about, join…) shows at its own path too
  if (isSitePage(slug)) revalidatePath(pageHref(slug))
  return { ok: true, id: data.id, message: status === 'published' ? 'Published' : 'Draft saved' }
}

export async function deletePage(id: string): Promise<void> {
  const { supabase } = await requireOfficer()
  const { data } = await supabase.from('pages').delete().eq('id', id).select('title, slug').maybeSingle()
  await log(supabase, 'deleted page', data?.title)
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/pages', 'layout')
  // Taking a site page's dashboard version away brings the site's own back
  if (data && isSitePage(data.slug)) revalidatePath(pageHref(data.slug))
  redirect('/dashboard/pages')
}

// ── Map ─────────────────────────────────────────────────────────────────────

export async function savePlace(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parsePlace(form)
  if (!parsed.ok) return parsed
  const { data, error } = id
    ? await supabase.from('map_places').update(parsed.data).eq('id', id).select('id').single()
    : await supabase.from('map_places').insert(parsed.data).select('id').single()
  if (error) return failure(error)
  await log(supabase, id ? 'updated map pin' : 'added map pin', parsed.data.name)
  revalidatePath('/dashboard/map')
  revalidatePath('/map')
  return { ok: true, id: data.id, message: parsed.data.published ? 'Saved and on the map' : 'Saved (hidden from the map)' }
}

export async function deletePlace(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('map_places').delete().eq('id', id).select('name').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed map pin', data?.name)
  revalidatePath('/dashboard/map')
  revalidatePath('/map')
  return { ok: true }
}

// ── Eateries ────────────────────────────────────────────────────────────────

/** Everywhere places to eat show: the /eat page, pages and posts with an Eateries block, and the map */
const revalidateEateries = () => {
  revalidatePath('/dashboard/eateries')
  revalidatePath('/eat')
  revalidatePath('/map')
  revalidatePath('/pages', 'layout')
  revalidatePath('/posts', 'layout')
}

export async function saveEatery(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const existing = id ? (await supabase.from('eateries').select('slug').eq('id', id).maybeSingle()).data : null
  if (id && !existing) return { ok: false, error: 'That eatery is gone; it may have been deleted.' }
  const parsed = parseEatery(form, existing?.slug ?? null)
  if (!parsed.ok) return parsed
  const { data, error } = id
    ? await supabase.from('eateries').update(parsed.data).eq('id', id).select('id').single()
    : await supabase.from('eateries').insert(parsed.data).select('id').single()
  if (error) return error.code === '23505' ? { ok: false, errors: { name: 'Another eatery already has this name.' } } : failure(error)
  await log(supabase, id ? 'updated eatery' : 'added eatery', parsed.data.name)
  revalidateEateries()
  return { ok: true, id: data.id, message: parsed.data.published ? 'Saved' : 'Saved (hidden from the site)' }
}

export async function deleteEatery(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('eateries').delete().eq('id', id).select('name').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed eatery', data?.name)
  revalidateEateries()
  return { ok: true }
}

// ── Settings (admins) ───────────────────────────────────────────────────────

export async function saveSettings(form: FormData): Promise<ActionResult> {
  const { supabase, officer } = await requireAdmin()
  const parsed = parseSettings(form)
  if (!parsed.ok) return parsed
  const { error } = await supabase.from('club_settings').update({ ...parsed.data, updated_by: officer.email }).eq('id', 1)
  if (error) return failure(error)
  await log(supabase, 'updated club settings')
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Saved' }
}

export async function saveOfficer(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const parsed = parseOfficer(form)
  if (!parsed.ok) return parsed
  const { error } = await supabase.from('officers').upsert(parsed.data, { onConflict: 'email' })
  if (error) return failure(error)
  await log(supabase, 'gave dashboard access to', parsed.data.name ?? parsed.data.email)
  revalidatePath('/dashboard/settings')
  return { ok: true, message: `${parsed.data.email} can sign in now` }
}

export async function removeOfficer(email: string): Promise<ActionResult> {
  const { supabase, officer } = await requireAdmin()
  if (email.toLowerCase() === officer.email.toLowerCase()) return { ok: false, error: 'You can’t remove yourself; ask another admin.' }
  const { error } = await supabase.from('officers').delete().eq('email', email)
  if (error) return failure(error)
  await log(supabase, 'removed dashboard access for', email)
  revalidatePath('/dashboard/settings')
  return { ok: true }
}

// ── Web addresses ───────────────────────────────────────────────────────────

/** Whether a post or page web address is free (ignoring the one being edited) */
export async function checkSlug(kind: 'post' | 'page', slug: string, exceptId: string | null): Promise<{ ok: true } | { ok: false; message: string }> {
  const { supabase } = await requireOfficer()
  const table = kind === 'post' ? 'posts' : 'pages'
  let query = supabase.from(table).select('id', { count: 'exact', head: true }).eq('slug', slug)
  if (exceptId) query = query.neq('id', exceptId)
  const { count, error } = await query
  if (error) return { ok: false, message: 'Couldn’t check; saving will tell you if it’s taken.' }
  return count ? { ok: false, message: `Another ${kind} already uses this address.` } : { ok: true }
}
