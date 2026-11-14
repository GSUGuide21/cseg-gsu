'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { atlantaToday } from '@/lib/eateries'
import { CHROME_PARTS, missingMenus, navigationFrom } from '@/lib/siteChrome'
import { isReservedSlug, isSitePage } from '@/lib/sitePages'
import { createPublicClient } from '@/lib/supabase/server'
import type { DocumentCommentRow, PageRow, PostRow, SiteChromeRow } from '@/lib/supabase/types'

import { requireAdmin, requireOfficer, requireStaff } from './dal'
import { formatDate } from './format'
import { listEvents } from './queries'
import { overlappingTerm } from './terms'
import {
  isPublicUrl,
  inCampusBounds,
  parseCheckin,
  parseAffiliate,
  parseClosure,
  parseConnection,
  parseContactMessage,
  parseDocument,
  parseDues,
  parseEatery,
  parseEvent,
  parseExecutive,
  parseFaq,
  parseGuidePick,
  parseGroups,
  parseHomepage,
  parseJoinRequest,
  parseMember,
  parseMinutes,
  parsePageMeta,
  parseOfficer,
  parsePlace,
  parsePresentation,
  parseRedirect,
  parseResource,
  parseRsvp,
  parseSettings,
  parseSiteChrome,
  parseSponsor,
  parseTerm,
  type ActionResult,
} from './validate'

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

/**
 * Everything on the public site. A post, page, eatery, or resource can show on any page (a
 * References block can point at it, /about included), so a change to one refreshes them all
 * rather than only its own address. The site is small; this is cheap.
 */
const revalidateSite = () => revalidatePath('/', 'layout')

/**
 * Columns from the newest migration. Until it has run the database doesn't know them, so a
 * save that names one is tried again without them: everything else still saves.
 */
const NEW_COLUMNS = new Set(['tip', 'parent_id', 'nav_placement', 'nav_label', 'nav_sort', 'header_menu', 'previous_content', 'previous'])
const isMissingColumn = (error: { code?: string } | null) => error?.code === 'PGRST204' || error?.code === '42703'
const withoutNewColumns = <T extends object>(values: T) => Object.fromEntries(Object.entries(values).filter(([k]) => !NEW_COLUMNS.has(k))) as T

/** Runs a save, and once more without the newest columns if the database doesn't have them yet */
const saving = async <T extends object, R extends { error: { code?: string; message: string } | null }>(values: T, write: (values: T) => PromiseLike<R>): Promise<R> => {
  const result = await write(values)
  return isMissingColumn(result.error) ? write(withoutNewColumns(values)) : result
}

/** A review is for drafts, so publishing settles it */
const reviewOf = ({ status, review_requested, review_note }: { status: string; review_requested: boolean; review_note: string | null }) =>
  status === 'published' ? { review_requested: false, review_note: null } : { review_requested, review_note: review_requested ? review_note : null }

const savedMessage = (status: string, publishAt: string | null) =>
  status !== 'published' ? 'Draft saved' : publishAt && Date.parse(publishAt) > Date.now() ? `Scheduled for ${formatDate(publishAt, true)}` : 'Published'

const log = async (supabase: Supabase, action: string, subject?: string) => {
  // The feed is a nicety: a failed note shouldn't fail the change itself
  await supabase.from('activity').insert({ action, subject: subject ?? null })
}

// ── Members ─────────────────────────────────────────────────────────────────

export async function saveMember(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff()
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
  const { supabase } = await requireStaff()
  const { error } = await supabase.from('members').update({ status }).in('id', ids)
  if (error) return failure(error)
  await log(supabase, `marked ${status}`, `${ids.length} member${ids.length === 1 ? '' : 's'}`)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

export async function removeMembers(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireStaff()
  const { error } = await supabase.from('members').delete().in('id', ids)
  if (error) return failure(error)
  await log(supabase, 'removed', `${ids.length} member${ids.length === 1 ? '' : 's'}`)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

// ── Check-ins ───────────────────────────────────────────────────────────────

/** The member a guest's email belongs to, adding them (as new) if nobody has it; null if that fails */
const memberForGuest = async (supabase: Supabase, name: string, email: string) => {
  const { data: existing } = await supabase.from('members').select('id').eq('email', email).maybeSingle()
  if (existing) return existing.id
  const { data: added } = await supabase.from('members').insert({ name, email, status: 'new' }).select('id').single()
  return added?.id ?? null
}

export async function checkIn(form: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff()
  const parsed = parseCheckin(form)
  if (!parsed.ok) return parsed
  let memberId = parsed.data.member_id
  if (!memberId) {
    // How guests are handled is a setting; before its migration runs, guests are let in as they always were
    const { data: rules } = await supabase.from('club_settings').select('walkins_allowed, walkins_become_members').eq('id', 1).maybeSingle()
    if (rules?.walkins_allowed === false) return { ok: false, error: 'Only members are being checked in. Add them to Members first, or allow guests in Settings.' }
    if (rules?.walkins_become_members && parsed.data.email) memberId = await memberForGuest(supabase, parsed.data.name, parsed.data.email)
  }
  // PIN stops listing an event once it ends, so its name is kept with the check-in
  const { upcoming, past } = await listEvents()
  const event = [...upcoming, ...past].find((e) => e.id === parsed.data.event_id)
  const { error } = await supabase.from('event_checkins').insert({ ...parsed.data, member_id: memberId, event_name: event?.name ?? null })
  if (error) return error.code === '23505' ? { ok: false, error: `${parsed.data.name} is already checked in.` } : failure(error)
  await log(supabase, 'checked in', parsed.data.name)
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: `Checked in ${parsed.data.name}` }
}

export async function undoCheckIn(id: string): Promise<ActionResult> {
  const { supabase } = await requireStaff()
  const { error } = await supabase.from('event_checkins').delete().eq('id', id)
  if (error) return failure(error)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

// ── Posts and pages ─────────────────────────────────────────────────────────

/** The save the editor's copy was built on (sent as `loaded_at`), if it sent one */
const loadedAt = (form: FormData) => {
  const v = form.get('loaded_at')
  return typeof v === 'string' && v && !Number.isNaN(Date.parse(v)) ? v : null
}

/**
 * A save that changed nothing because the post or page was saved again after the editor
 * opened it: says who by, so the editor can offer their version instead of overwriting it.
 */
const behind = async (supabase: Supabase, kind: 'page' | 'post', id: string): Promise<ActionResult> => {
  const { table, key } = REVISIONS[kind]
  const { data } = await supabase
    .from(table as 'page_revisions')
    .select('saved_at, saved_by')
    .eq(key as 'page_id', id)
    .order('saved_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) {
    // No save of it at all: it's been deleted
    const { count } = await supabase.from(kind === 'page' ? 'pages' : 'posts').select('id', { count: 'exact', head: true }).eq('id', id)
    if (!count) return { ok: false, error: `That ${kind} has been deleted.` }
  }
  const name = data?.saved_by?.split('@')[0] ?? 'Someone else'
  return { ok: false, error: `${name} saved this ${kind} after you opened it, so yours wasn’t saved over theirs.`, conflict: { name, at: data?.saved_at ?? new Date().toISOString() } }
}

export async function savePost(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase, officer } = await requireOfficer()
  const parsed = parseDocument(form)
  if (!parsed.ok) return parsed
  const { title, slug, status, body, excerpt, cover_image_url, category, featured, publish_at, unpublish_at } = parsed.data
  const row = { title, slug, status, body, excerpt, cover_image_url, category, featured, publish_at, unpublish_at, ...reviewOf(parsed.data) }
  // Dated when it first goes up; a post taken down and put back up keeps its first date
  let publishedAt: string | null | undefined
  if (status === 'published') {
    const existing = id ? (await supabase.from('posts').select('published_at').eq('id', id).maybeSingle()).data : null
    const wentUp = existing?.published_at && Date.parse(existing.published_at) <= Date.now() ? existing.published_at : null
    publishedAt = wentUp ?? publish_at ?? new Date().toISOString()
  }
  const values = { ...row, ...(publishedAt ? { published_at: publishedAt } : {}), ...(id ? {} : { author_name: officer.name }) }
  // Saved only over the version the editor has: no row changed means someone saved since
  const expected = id ? loadedAt(form) : null
  const { data, error } = !id
    ? await supabase.from('posts').insert(values).select('id, updated_at').single()
    : expected
      ? await supabase.from('posts').update(values).eq('id', id).eq('updated_at', expected).select('id, updated_at').maybeSingle()
      : await supabase.from('posts').update(values).eq('id', id).select('id, updated_at').single()
  if (error) return failure(error, 'That web address')
  if (!data) return behind(supabase, 'post', id!)
  await log(supabase, id ? (status === 'published' ? 'updated post' : 'saved draft') : 'wrote post', title)
  revalidateSite()
  return { ok: true, id: data.id, updatedAt: data.updated_at, message: savedMessage(status, publish_at) }
}

export async function deletePost(id: string): Promise<void> {
  const { supabase } = await requireOfficer()
  await supabase.from('document_comments').delete().eq('doc_kind', 'post').eq('doc_id', id)
  const { data } = await supabase.from('posts').delete().eq('id', id).select('title').maybeSingle()
  await log(supabase, 'deleted post', data?.title)
  revalidateSite()
  redirect('/dashboard/posts')
}

export async function savePage(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase, officer } = await requireOfficer()
  const parsed = parseDocument(form)
  if (!parsed.ok) return parsed
  const { title, slug, status, body, description, subtitle, layout, sections, eyebrow, share_image_url, show_toc, show_updated, publish_at, unpublish_at, nav_placement, nav_label, nav_sort, header_menu } = parsed.data
  if (isReservedSlug(slug)) return { ok: false, errors: { slug: `The site already uses /${slug} for something else. Pick another address.` } }
  // One of the site's own pages stays at its own path, so it can't sit under another
  const parent_id = isSitePage(slug) || parsed.data.parent_id === id ? null : parsed.data.parent_id
  const values = { title, slug, status, body, description, subtitle, layout, sections, eyebrow, share_image_url, show_toc, show_updated, publish_at, unpublish_at, parent_id, nav_placement, nav_label, nav_sort, header_menu, updated_by: officer.email, ...reviewOf(parsed.data) }
  // Saved only over the version the editor has: no row changed means someone saved since
  const expected = id ? loadedAt(form) : null
  const { data, error } = await saving(values, (v) =>
    !id
      ? supabase.from('pages').insert(v).select('id, updated_at').single()
      : expected
        ? supabase.from('pages').update(v).eq('id', id).eq('updated_at', expected).select('id, updated_at').maybeSingle()
        : supabase.from('pages').update(v).eq('id', id).select('id, updated_at').single()
  )
  // The database keeps pages one level deep, and says which way it broke
  if (error?.code === 'P0001') return { ok: false, errors: { parent_id: error.message } }
  if (error?.code === '23503') return { ok: false, errors: { parent_id: 'That page is gone; pick another.' } }
  if (error) return failure(error, 'That web address')
  if (!data) return id && expected ? behind(supabase, 'page', id) : failure({ message: 'That didn’t save.' })
  await log(supabase, id ? 'updated page' : 'created page', title)
  revalidateSite()
  return { ok: true, id: data.id, updatedAt: data.updated_at, message: savedMessage(status, publish_at) }
}

export async function deletePage(id: string): Promise<void> {
  const { supabase } = await requireOfficer()
  // Its comments go with it (they're only about its writing)
  await supabase.from('document_comments').delete().eq('doc_kind', 'page').eq('doc_id', id)
  const { data } = await supabase.from('pages').delete().eq('id', id).select('title, slug').maybeSingle()
  await log(supabase, 'deleted page', data?.title)
  revalidateSite()
  redirect('/dashboard/pages')
}

/** The first free address for a copy: hello-copy, then hello-copy-2 */
const copySlug = async (supabase: Supabase, table: 'posts' | 'pages' | 'presentations', slug: string) => {
  for (let n = 1; n <= 50; n++) {
    const candidate = `${slug}-copy${n > 1 ? `-${n}` : ''}`
    const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('slug', candidate)
    if (error) return null
    if (!count) return candidate
  }
  return null
}

/** A new draft from a post, page, or presentation, for what recurs: its writing, not its schedule or its place on the site */
export async function duplicateDocument(kind: 'post' | 'page' | 'presentation', id: string): Promise<ActionResult> {
  const { supabase, officer } = await requireOfficer()
  const table = kind === 'post' ? 'posts' : kind === 'page' ? 'pages' : 'presentations'
  const insert = async (source: { slug: string; title: string }, row: Record<string, unknown>) => {
    const slug = await copySlug(supabase, table, source.slug)
    if (!slug) return { error: { message: 'There are too many copies of this already.' } as { code?: string; message: string }, data: null }
    return supabase.from(table).insert({ ...row, slug, title: `Copy of ${source.title}`, status: 'draft' } as never).select('id').single()
  }
  let result
  if (kind === 'post') {
    const { data: post } = await supabase.from('posts').select('*').eq('id', id).maybeSingle()
    if (!post) return { ok: false, error: 'That post is gone.' }
    const { slug, title, excerpt, body, cover_image_url, category } = post
    result = await insert({ slug, title }, { excerpt, body, cover_image_url, category, author_name: officer.name })
  } else if (kind === 'presentation') {
    const { data: deck } = await supabase.from('presentations').select('*').eq('id', id).maybeSingle()
    if (!deck) return { ok: false, error: 'That presentation is gone.' }
    const { slug, title, description, slides, visibility } = deck
    result = await insert({ slug, title }, { description, slides, visibility, author_name: officer.name })
  } else {
    const { data: page } = await supabase.from('pages').select('*').eq('id', id).maybeSingle()
    if (!page) return { ok: false, error: 'That page is gone.' }
    const { slug, title, description, subtitle, layout, sections, body, eyebrow, share_image_url, show_toc, show_updated } = page
    result = await insert({ slug, title }, { description, subtitle, layout, sections, body, eyebrow, share_image_url, show_toc, show_updated })
  }
  if (result.error || !result.data) return failure(result.error ?? { message: 'That didn’t copy.' })
  await log(supabase, `duplicated ${kind}`, id)
  revalidatePath('/dashboard', 'layout')
  return { ok: true, id: (result.data as { id: string }).id, message: 'Copied to a new draft' }
}

/**
 * Which of these links look broken, for the editor's checks. Only a clear "not here" counts:
 * sites that turn away a robot or time out may be fine for people. Redirects aren't followed,
 * so a link can't steer the check somewhere private.
 */
export async function checkLinks(urls: string[]): Promise<string[]> {
  await requireOfficer()
  const links = [...new Set(urls)].filter(isPublicUrl).slice(0, 25)
  const results = await Promise.all(
    links.map(async (url) => {
      try {
        const { status } = await fetch(url, { method: 'HEAD', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(6000) })
        return status === 404 || status === 410 ? url : null
      } catch (e) {
        // A timeout says little; no such site at all says plenty
        return e instanceof Error && e.name === 'TimeoutError' ? null : url
      }
    })
  )
  return results.filter((url): url is string => url !== null)
}

// ── Presentations ───────────────────────────────────────────────────────────

/** Saves a slide deck. Like a post, it's saved only over the version the editor has. */
export async function savePresentation(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase, officer } = await requireOfficer()
  const parsed = parsePresentation(form)
  if (!parsed.ok) return parsed
  const { title, status } = parsed.data
  // Dated when it first goes up; one taken down and put back keeps its first date
  let publishedAt: string | undefined
  if (status === 'published') {
    const existing = id ? (await supabase.from('presentations').select('published_at').eq('id', id).maybeSingle()).data : null
    publishedAt = existing?.published_at ?? new Date().toISOString()
  }
  const values = { ...parsed.data, updated_by: officer.email, ...(publishedAt ? { published_at: publishedAt } : {}), ...(id ? {} : { author_name: officer.name }) }
  const expected = id ? loadedAt(form) : null
  const { data, error } = !id
    ? await supabase.from('presentations').insert(values).select('id, updated_at').single()
    : expected
      ? await supabase.from('presentations').update(values).eq('id', id).eq('updated_at', expected).select('id, updated_at').maybeSingle()
      : await supabase.from('presentations').update(values).eq('id', id).select('id, updated_at').single()
  if (error) return failure(error, 'That web address')
  if (!data) {
    // Nothing changed: it was saved again after the editor opened it, or it's gone
    const { data: now } = await supabase.from('presentations').select('updated_at, updated_by').eq('id', id!).maybeSingle()
    if (!now) return { ok: false, error: 'That presentation has been deleted.' }
    const name = now.updated_by?.split('@')[0] ?? 'Someone else'
    return { ok: false, error: `${name} saved this presentation after you opened it, so yours wasn’t saved over theirs.`, conflict: { name, at: now.updated_at } }
  }
  await log(supabase, id ? (status === 'published' ? 'updated presentation' : 'saved draft') : 'created presentation', title)
  revalidateSite()
  return { ok: true, id: data.id, updatedAt: data.updated_at, message: status === 'published' ? 'Published' : 'Draft saved' }
}

export async function deletePresentation(id: string): Promise<void> {
  const { supabase } = await requireOfficer()
  const { data } = await supabase.from('presentations').delete().eq('id', id).select('title').maybeSingle()
  await log(supabase, 'deleted presentation', data?.title)
  revalidateSite()
  redirect('/dashboard/presentations')
}

// ── Revisions ───────────────────────────────────────────────────────────────

// The two tables are the same shape; the client's types follow one table at a time, hence the casts below
const REVISIONS = { page: { table: 'page_revisions', key: 'page_id' }, post: { table: 'post_revisions', key: 'post_id' } } as const

/** What a restore brings back: the writing, not the web address or whether it's published */
const RESTORED = { page: ['title', 'description', 'subtitle', 'layout', 'sections', 'body', 'eyebrow', 'share_image_url', 'show_toc', 'show_updated'], post: ['title', 'excerpt', 'body', 'cover_image_url'] } as const

export type RevisionSummary = { id: string; saved_at: string; saved_by: string | null; title: string | null; status: string | null }

/** A page's or post's saved versions, newest first, without their writing (that's getRevision's) */
export async function listRevisions(kind: 'page' | 'post', docId: string): Promise<RevisionSummary[]> {
  const { supabase } = await requireOfficer()
  const { table, key } = REVISIONS[kind]
  const { data, error } = await supabase
    .from(table as 'page_revisions')
    .select('id, saved_at, saved_by, title:snapshot->>title, status:snapshot->>status')
    .eq(key as 'page_id', docId)
    .order('saved_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as unknown as RevisionSummary[]
}

/** One saved version, all of it */
export async function getRevision(kind: 'page' | 'post', revisionId: string) {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from(REVISIONS[kind].table).select('snapshot').eq('id', revisionId).maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.snapshot ?? null) as Record<string, unknown> | null
}

/** Puts a saved version's writing back. That's a save too, so it can itself be undone from the history. */
export async function restoreRevision(kind: 'page' | 'post', docId: string, revisionId: string): Promise<ActionResult> {
  const { supabase, officer } = await requireOfficer()
  const { table, key } = REVISIONS[kind]
  const { data: revision } = await supabase.from(table as 'page_revisions').select('snapshot').eq('id', revisionId).eq(key as 'page_id', docId).maybeSingle()
  if (!revision) return { ok: false, error: 'That version is gone; only the newest 50 are kept.' }
  const snapshot = revision.snapshot as Record<string, unknown>
  const values = Object.fromEntries(RESTORED[kind].filter((k) => k in snapshot).map((k) => [k, snapshot[k]]))
  const { data, error } =
    kind === 'page'
      ? await supabase.from('pages').update({ ...values, updated_by: officer.email } as Partial<PageRow>).eq('id', docId).select('slug, title').single()
      : await supabase.from('posts').update(values as Partial<PostRow>).eq('id', docId).select('slug, title').single()
  if (error) return failure(error)
  await log(supabase, `restored an earlier version of ${kind === 'page' ? 'page' : 'post'}`, data.title)
  revalidateSite()
  return { ok: true, message: 'Restored' }
}

// ── Map ─────────────────────────────────────────────────────────────────────

export async function savePlace(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parsePlace(form)
  if (!parsed.ok) return parsed
  const { data, error } = await saving(parsed.data, (v) =>
    id ? supabase.from('map_places').update(v).eq('id', id).select('id').single() : supabase.from('map_places').insert(v).select('id').single()
  )
  if (error || !data) return failure(error ?? { message: 'That didn’t save.' })
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

/** A pin dragged on the dashboard's map: only its spot changes */
export async function movePlace(id: string, lat: number, lng: number): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  if (!inCampusBounds(lat, lng)) return { ok: false, error: 'That’s too far from campus for a pin.' }
  const { data, error } = await supabase.from('map_places').update({ lat, lng }).eq('id', id).select('name').single()
  if (error) return failure(error)
  await log(supabase, 'moved map pin', data.name)
  revalidatePath('/dashboard/map')
  revalidatePath('/map')
  return { ok: true }
}

// ── Eateries ────────────────────────────────────────────────────────────────

/** Places to eat show on /eat, the map, and any page with References */
const revalidateEateries = revalidateSite

export async function saveEatery(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const existing = id ? (await supabase.from('eateries').select('slug').eq('id', id).maybeSingle()).data : null
  if (id && !existing) return { ok: false, error: 'That eatery is gone; it may have been deleted.' }
  const parsed = parseEatery(form, existing?.slug ?? null)
  if (!parsed.ok) return parsed
  const { data, error } = await saving(parsed.data, (v) =>
    id ? supabase.from('eateries').update(v).eq('id', id).select('id').single() : supabase.from('eateries').insert(v).select('id').single()
  )
  if (error || !data)
    return error?.code === '23505'
      ? { ok: false, errors: { name: 'Another eatery already has this name.' } }
      : error?.code === '23503'
        ? { ok: false, errors: { area: 'That area is gone; pick another.' } }
        : failure(error ?? { message: 'That didn’t save.' })
  await log(supabase, id ? 'updated eatery' : 'added eatery', parsed.data.name)
  revalidateEateries()
  return { ok: true, id: data.id, message: parsed.data.published ? 'Saved' : 'Saved (hidden from the site)' }
}

/** Notes that an officer confirmed these eateries' details today (Atlanta's today) */
export async function markEateriesChecked(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { error } = await supabase.from('eateries').update({ checked_on: atlantaToday() }).in('id', ids)
  if (error) return failure(error)
  await log(supabase, 'checked', `${ids.length} ${ids.length === 1 ? 'eatery' : 'eateries'}`)
  revalidatePath('/dashboard/eateries')
  return { ok: true, message: 'Marked as checked today' }
}

export async function deleteEatery(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('eateries').delete().eq('id', id).select('name').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed eatery', data?.name)
  revalidateEateries()
  return { ok: true }
}

/** An area's eateries in a new order, as dragged: first to last */
export async function reorderEateries(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const results = await Promise.all(ids.map((id, i) => supabase.from('eateries').update({ sort: (i + 1) * 10 }).eq('id', id)))
  const failed = results.find((r) => r.error)?.error
  if (failed) return failure(failed)
  await log(supabase, 'reordered eateries', `${ids.length} of them`)
  revalidateEateries()
  return { ok: true, message: 'Order saved' }
}

/**
 * The areas, all of them in their new order: renamed, added (made from their name), and any
 * left out deleted. An area that still has eateries can't go; its eateries move first.
 */
export async function saveAreas(list: unknown): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parseGroups(list)
  if (!parsed.ok) return parsed
  const { data: before, error: readError } = await supabase.from('eatery_areas').select('slug, title')
  if (readError) return failure(readError)
  // Areas have no icon
  const { error } = await supabase.from('eatery_areas').upsert(parsed.data.map(({ slug, title, description, sort }) => ({ slug, title, description, sort })), { onConflict: 'slug' })
  if (error) return failure(error)
  const gone = (before ?? []).filter((b) => !parsed.data.some((a) => a.slug === b.slug))
  for (const area of gone) {
    const { error: deleteError } = await supabase.from('eatery_areas').delete().eq('slug', area.slug)
    if (deleteError) return deleteError.code === '23503' ? { ok: false, error: `${area.title} still has eateries. Move them to another area first.` } : failure(deleteError)
  }
  await log(supabase, 'updated eatery areas')
  revalidateEateries()
  return { ok: true, message: 'Areas saved' }
}

export async function saveClosure(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parseClosure(form)
  if (!parsed.ok) return parsed
  const { data, error } = id
    ? await supabase.from('eatery_closures').update(parsed.data).eq('id', id).select('id').single()
    : await supabase.from('eatery_closures').insert(parsed.data).select('id').single()
  if (error) return failure(error)
  await log(supabase, id ? 'updated closure' : 'added closure', parsed.data.label)
  revalidateEateries()
  return { ok: true, id: data.id, message: 'Closure saved' }
}

export async function deleteClosure(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('eatery_closures').delete().eq('id', id).select('label').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed closure', data?.label)
  revalidateEateries()
  return { ok: true }
}

// ── Events ──────────────────────────────────────────────────────────────────

/** Events show on /events, the homepage, and any page with an events block or chip */
const revalidateEvents = revalidateSite

export async function saveEvent(slug: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  if (slug && !(await supabase.from('events').select('slug').eq('slug', slug).maybeSingle()).data) return { ok: false, error: 'That event is gone; it may have been deleted.' }
  const parsed = parseEvent(form, slug)
  if (!parsed.ok) return parsed
  const { error } = slug ? await supabase.from('events').update(parsed.data).eq('slug', slug) : await supabase.from('events').insert(parsed.data)
  if (error) return error.code === '23505' ? { ok: false, errors: { name: 'There’s already an event with this name that day.' } } : failure(error)
  await log(supabase, slug ? 'updated event' : 'added event', parsed.data.name)
  revalidateEvents()
  revalidatePath('/dashboard/events')
  return { ok: true, id: parsed.data.slug, message: parsed.data.published ? 'Saved' : 'Saved (hidden from the site)' }
}

export async function deleteEvent(slug: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('events').delete().eq('slug', slug).select('name').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed event', data?.name)
  revalidateEvents()
  revalidatePath('/dashboard/events')
  return { ok: true }
}

// ── Executives ──────────────────────────────────────────────────────────────

export async function saveExecutive(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parseExecutive(form)
  if (!parsed.ok) return parsed
  const { data, error } = id
    ? await supabase.from('executives').update(parsed.data).eq('id', id).select('id').maybeSingle()
    : await supabase.from('executives').insert(parsed.data).select('id').single()
  if (error) return failure(error)
  if (!data) return { ok: false, error: 'That executive is gone; they may have been removed.' }
  const name = `${parsed.data.first_name} ${parsed.data.last_name}`
  await log(supabase, id ? 'updated executive' : 'added executive', name)
  revalidatePath('/executives')
  return { ok: true, id: data.id, message: parsed.data.published ? 'Saved' : 'Saved (hidden from the site)' }
}

export async function deleteExecutive(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('executives').delete().eq('id', id).select('first_name, last_name').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed executive', data ? `${data.first_name} ${data.last_name}` : undefined)
  revalidatePath('/executives')
  return { ok: true }
}

// ── Affiliates ──────────────────────────────────────────────────────────────

/** Affiliates show on /affiliates, their own pages, the sitemap, and search */
const revalidateAffiliates = revalidateSite

/** One past the end of a list ordered by sort, for something just added */
const nextSort = async (supabase: Supabase, table: 'affiliates' | 'map_connections' | 'faqs' | 'sponsors' | 'guide_picks') => {
  const { data } = await supabase.from(table).select('sort').order('sort', { ascending: false }).limit(1).maybeSingle()
  return (data?.sort ?? 0) + 10
}

export async function saveAffiliate(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const existing = id ? (await supabase.from('affiliates').select('slug').eq('id', id).maybeSingle()).data : null
  if (id && !existing) return { ok: false, error: 'That affiliate is gone; it may have been removed.' }
  const parsed = parseAffiliate(form, existing?.slug ?? null)
  if (!parsed.ok) return parsed
  const { data, error } = id
    ? await supabase.from('affiliates').update(parsed.data).eq('id', id).select('id').single()
    : await supabase
        .from('affiliates')
        .insert({ ...parsed.data, sort: await nextSort(supabase, 'affiliates') })
        .select('id')
        .single()
  if (error) return error.code === '23505' ? { ok: false, errors: { short_name: 'Another affiliate already has this name; give it another web address.' } } : failure(error)
  await log(supabase, id ? 'updated affiliate' : 'added affiliate', parsed.data.short_name)
  revalidateAffiliates()
  return { ok: true, id: data.id, message: parsed.data.published ? 'Saved' : 'Saved (hidden from the site)' }
}

export async function deleteAffiliate(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('affiliates').delete().eq('id', id).select('short_name').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed affiliate', data?.short_name)
  revalidateAffiliates()
  return { ok: true }
}

/** The affiliates in a new order, as dragged: first to last */
export async function reorderAffiliates(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const results = await Promise.all(ids.map((id, i) => supabase.from('affiliates').update({ sort: (i + 1) * 10 }).eq('id', id)))
  const failed = results.find((r) => r.error)?.error
  if (failed) return failure(failed)
  await log(supabase, 'reordered affiliates')
  revalidateAffiliates()
  return { ok: true, message: 'Order saved' }
}

// ── Skybridges and shortcuts ────────────────────────────────────────────────

const revalidateConnections = () => {
  revalidatePath('/dashboard/connections')
  revalidatePath('/map')
}

export async function saveConnection(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const existing = id ? (await supabase.from('map_connections').select('slug').eq('id', id).maybeSingle()).data : null
  if (id && !existing) return { ok: false, error: 'That connection is gone; it may have been removed.' }
  const parsed = parseConnection(form, existing?.slug ?? null)
  if (!parsed.ok) return parsed
  const { data, error } = id
    ? await supabase.from('map_connections').update(parsed.data).eq('id', id).select('id').single()
    : await supabase
        .from('map_connections')
        .insert({ ...parsed.data, sort: await nextSort(supabase, 'map_connections') })
        .select('id')
        .single()
  if (error) return error.code === '23505' ? { ok: false, errors: { name: 'Another skybridge or shortcut already has this name.' } } : failure(error)
  await log(supabase, id ? 'updated map shortcut' : 'added map shortcut', parsed.data.name)
  revalidateConnections()
  return { ok: true, id: data.id, message: parsed.data.published ? 'Saved; routes use it now' : 'Saved (hidden from the map)' }
}

export async function deleteConnection(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('map_connections').delete().eq('id', id).select('name').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed map shortcut', data?.name)
  revalidateConnections()
  return { ok: true }
}

// ── Messages ────────────────────────────────────────────────────────────────

/**
 * A message from the Contact page, from anyone: no sign-in, written with the public key (the
 * table lets anyone add an unread one, and nobody but officers read them back). A bot that
 * fills in the hidden field is told it worked, and nothing is saved.
 */
export async function sendContactMessage(form: FormData): Promise<ActionResult> {
  const parsed = parseContactMessage(form)
  if (!parsed.ok) return parsed
  if (parsed.bot) return { ok: true }
  const supabase = createPublicClient()
  if (!supabase) return { ok: false, error: 'Messages can’t be sent from here right now.' }
  // Officers can turn the form off in Settings; a page still open from before is told so
  const { data: settings } = await supabase.from('club_settings').select('contact_form_open').eq('id', 1).maybeSingle()
  if (settings?.contact_form_open === false) return { ok: false, error: 'Messages aren’t being taken from here right now.' }
  const { error } = await supabase.from('contact_messages').insert(parsed.data)
  if (error) return { ok: false, error: error.code === 'P0001' ? error.message : 'Your message didn’t go through.' }
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

/** Messages marked read (by this officer, now) or unread again */
export async function markMessages(ids: string[], read: boolean): Promise<ActionResult> {
  const { supabase, officer } = await requireStaff()
  const { error } = await supabase
    .from('contact_messages')
    .update(read ? { read_at: new Date().toISOString(), read_by: officer.email } : { read_at: null, read_by: null })
    .in('id', ids)
  if (error) return failure(error)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

export async function deleteMessages(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireStaff()
  const { error } = await supabase.from('contact_messages').delete().in('id', ids)
  if (error) return failure(error)
  await log(supabase, ids.length === 1 ? 'deleted a message' : `deleted ${ids.length} messages`)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

// ── Resources ───────────────────────────────────────────────────────────────

/** Resources show on /resources and any page with References */
const revalidateResources = revalidateSite

export async function saveResource(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const existing = id ? (await supabase.from('resources').select('slug').eq('id', id).maybeSingle()).data : null
  if (id && !existing) return { ok: false, error: 'That resource is gone; it may have been deleted.' }
  const parsed = parseResource(form, existing?.slug ?? null)
  if (!parsed.ok) return parsed
  const { data, error } = await saving(parsed.data, (v) =>
    id ? supabase.from('resources').update(v).eq('id', id).select('id').single() : supabase.from('resources').insert(v).select('id').single()
  )
  if (error || !data)
    return error?.code === '23505'
      ? { ok: false, errors: { label: 'Another resource already has this name.' } }
      : error?.code === '23503'
        ? { ok: false, errors: { group_slug: 'That group is gone; pick another.' } }
        : failure(error ?? { message: 'That didn’t save.' })
  await log(supabase, id ? 'updated resource' : 'added resource', parsed.data.label)
  revalidateResources()
  return { ok: true, id: data.id, message: parsed.data.published ? 'Saved' : 'Saved (hidden from the site)' }
}

export async function deleteResource(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('resources').delete().eq('id', id).select('label').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed resource', data?.label)
  revalidateResources()
  return { ok: true }
}

/** A group's resources in a new order, as dragged: first to last */
export async function reorderResources(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const results = await Promise.all(ids.map((id, i) => supabase.from('resources').update({ sort: (i + 1) * 10 }).eq('id', id)))
  const failed = results.find((r) => r.error)?.error
  if (failed) return failure(failed)
  await log(supabase, 'reordered resources', `${ids.length} of them`)
  revalidateResources()
  return { ok: true, message: 'Order saved' }
}

/** The resource groups, all of them in their new order (as saveAreas does for eateries) */
export async function saveResourceGroups(list: unknown): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parseGroups(list, { icons: true })
  if (!parsed.ok) return parsed
  const { data: before, error: readError } = await supabase.from('resource_groups').select('slug, title')
  if (readError) return failure(readError)
  const { error } = await supabase.from('resource_groups').upsert(parsed.data, { onConflict: 'slug' })
  if (error) return failure(error)
  for (const group of (before ?? []).filter((b) => !parsed.data.some((g) => g.slug === b.slug))) {
    const { error: deleteError } = await supabase.from('resource_groups').delete().eq('slug', group.slug)
    if (deleteError) return deleteError.code === '23503' ? { ok: false, error: `${group.title} still has resources. Move them to another group first.` } : failure(deleteError)
  }
  await log(supabase, 'updated resource groups')
  revalidateResources()
  return { ok: true, message: 'Groups saved' }
}

// ── Homepage ────────────────────────────────────────────────────────────────

export async function saveHomepage(form: FormData): Promise<ActionResult> {
  const { supabase, officer } = await requireOfficer()
  const parsed = parseHomepage(form)
  if (!parsed.ok) return parsed
  // What's there now is kept as the way back (unless nothing changed)
  const { data: row } = await supabase.from('homepage').select('content').eq('id', 1).maybeSingle()
  const keep = row && JSON.stringify(row.content) !== JSON.stringify(parsed.data) ? { previous_content: row.content } : {}
  const { error } = await saving({ content: parsed.data, updated_by: officer.email, ...keep }, (v) => supabase.from('homepage').update(v).eq('id', 1))
  if (error) return failure(error)
  await log(supabase, 'updated the homepage')
  revalidatePath('/')
  revalidatePath('/dashboard/homepage')
  return { ok: true, message: 'Saved and on the homepage' }
}

// ── Comments on posts' and pages' writing ───────────────────────────────────

const COMMENT_KINDS = new Set(['post', 'page'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const THREAD_RE = /^[a-z0-9-]{8,64}$/

export type CommentKind = 'post' | 'page'

/** A document's comments, oldest first; none before their migration runs */
export async function listComments(kind: CommentKind, docId: string): Promise<DocumentCommentRow[]> {
  const { supabase } = await requireOfficer()
  if (!COMMENT_KINDS.has(kind) || !UUID_RE.test(docId)) return []
  const { data, error } = await supabase.from('document_comments').select('*').eq('doc_kind', kind).eq('doc_id', docId).order('created_at')
  return error ? [] : (data ?? [])
}

/** A comment from whoever's signed in: the first of a thread (with the words it's on), or a reply */
export async function addComment(kind: CommentKind, docId: string, threadId: string, quote: string | null, body: string): Promise<ActionResult> {
  const { supabase, officer } = await requireOfficer()
  const text = body.trim()
  if (!COMMENT_KINDS.has(kind) || !UUID_RE.test(docId) || !THREAD_RE.test(threadId)) return { ok: false, error: 'Couldn’t find what that comment is on. Reload and try again.' }
  if (!text) return { ok: false, errors: { body: 'Write something first.' } }
  if (text.length > 2000) return { ok: false, errors: { body: 'Keep a comment under 2,000 characters.' } }
  const { data, error } = await supabase
    .from('document_comments')
    .insert({ doc_kind: kind, doc_id: docId, thread_id: threadId, quote: quote?.trim().slice(0, 500) || null, body: text, author_name: officer.name ?? officer.email.split('@')[0] })
    .select('id')
    .single()
  if (error || !data) return failure(error ?? { message: 'That comment didn’t save.' })
  return { ok: true, id: data.id }
}

/** Resolves a thread (or reopens it) */
export async function setThreadResolved(kind: CommentKind, docId: string, threadId: string, resolved: boolean): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  if (!COMMENT_KINDS.has(kind) || !UUID_RE.test(docId) || !THREAD_RE.test(threadId)) return { ok: false, error: 'Couldn’t find that thread. Reload and try again.' }
  const { error } = await supabase.from('document_comments').update({ resolved }).eq('doc_kind', kind).eq('doc_id', docId).eq('thread_id', threadId)
  return error ? failure(error) : { ok: true }
}

/** Takes back a comment (one's own; an admin can take back anyone's) */
export async function deleteComment(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  if (!UUID_RE.test(id)) return { ok: false, error: 'Couldn’t find that comment.' }
  const { data, error } = await supabase.from('document_comments').delete().eq('id', id).select('id')
  if (error) return failure(error)
  // Row-level security turns away someone else's comment by deleting nothing
  return data?.length ? { ok: true } : { ok: false, error: 'Only whoever wrote a comment (or an admin) can delete it.' }
}

// ── Navigation, header, footer, search ──────────────────────────────────────

/** Saves one of them (the form names which); the others stay as they are */
export async function saveSiteChrome(form: FormData): Promise<ActionResult> {
  const { supabase, officer } = await requireOfficer()
  const parsed = parseSiteChrome(form)
  if (!parsed.ok) return parsed
  const { part, content } = parsed.data
  const { data: row } = await supabase.from('site_chrome').select('*').eq('id', 1).maybeSingle()
  // A header or footer can only show menus that are there
  if (part === 'header' || part === 'footer') {
    const missing = missingMenus(part, content, navigationFrom(row?.navigation))
    if (Object.keys(missing).length) return { ok: false, errors: missing }
  }
  const change: Partial<SiteChromeRow> = { updated_by: officer.email }
  change[part] = content
  // The part as it is now is kept as the way back (unless nothing changed)
  if (row && JSON.stringify(row[part]) !== JSON.stringify(content)) {
    const before = typeof row.previous === 'object' && row.previous !== null ? row.previous : {}
    change.previous = { ...before, [part]: row[part] }
  }
  const { error } = await saving(change, (v) => supabase.from('site_chrome').update(v).eq('id', 1))
  if (error) return failure(error)
  const name = CHROME_PARTS[part].name
  await log(supabase, `updated the site’s ${name.toLowerCase()}`)
  // The header and footer are on every page of the site
  revalidatePath('/', 'layout')
  return { ok: true, message: `${name} saved and on the site` }
}

/** The built-in pages' tab titles and search descriptions, all at once */
export async function savePageMeta(form: FormData): Promise<ActionResult> {
  const { supabase, officer } = await requireOfficer()
  const parsed = parsePageMeta(form)
  if (!parsed.ok) return parsed
  const { error } = await supabase.from('page_meta').upsert(parsed.data.map((r) => ({ ...r, updated_by: officer.email })), { onConflict: 'path' })
  if (error) return failure(error)
  await log(supabase, 'updated page titles')
  for (const { path } of parsed.data) revalidatePath(path)
  revalidatePath('/dashboard/titles')
  return { ok: true, message: 'Saved; tabs and search show them as pages refresh' }
}

// ── Terms and dues ──────────────────────────────────────────────────────────

/** A semester, by its dates. No two share a day, so every day belongs to one term at most. */
export async function saveTerm(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const parsed = parseTerm(form)
  if (!parsed.ok) return parsed
  const { data: terms, error: readError } = await supabase.from('terms').select('id, name, starts_on, ends_on')
  if (readError) return failure(readError)
  const clash = overlappingTerm(terms ?? [], { id, ...parsed.data })
  if (clash) return { ok: false, errors: { dates: `Those days run into ${clash.name}.` } }
  const { data, error } = id
    ? await supabase.from('terms').update(parsed.data).eq('id', id).select('id').single()
    : await supabase.from('terms').insert(parsed.data).select('id').single()
  if (error) return error.code === '23505' ? { ok: false, errors: { name: 'Another term already has this name.' } } : failure(error)
  await log(supabase, id ? 'updated term' : 'added term', parsed.data.name)
  revalidatePath('/dashboard', 'layout')
  return { ok: true, id: data.id, message: `Saved ${parsed.data.name}` }
}

export async function deleteTerm(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('terms').delete().eq('id', id).select('name').maybeSingle()
  if (error) return error.code === '23503' ? { ok: false, error: 'This term has dues recorded. Remove those payments first.' } : failure(error)
  await log(supabase, 'removed term', data?.name)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

/** One member's dues for one term: recorded, or changed */
export async function saveDues(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase, officer } = await requireStaff()
  const parsed = parseDues(form)
  if (!parsed.ok) return parsed
  const { data: member } = await supabase.from('members').select('name').eq('id', parsed.data.member_id).maybeSingle()
  if (!member) return { ok: false, errors: { member_id: 'That member is gone; they may have been removed.' } }
  const { data, error } = id
    ? await supabase.from('dues_payments').update(parsed.data).eq('id', id).select('id').single()
    : await supabase
        .from('dues_payments')
        .insert({ ...parsed.data, recorded_by: officer.email })
        .select('id')
        .single()
  if (error)
    return error.code === '23505'
      ? { ok: false, errors: { member_id: `${member.name} has already paid for this term.` } }
      : error.code === '23503'
        ? { ok: false, errors: { term_id: 'That term is gone; pick another.' } }
        : failure(error)
  await log(supabase, id ? 'updated dues for' : parsed.data.method === 'waived' ? 'waived dues for' : 'recorded dues for', member.name)
  revalidatePath('/dashboard', 'layout')
  return { ok: true, id: data.id, message: parsed.data.method === 'waived' ? `Waived for ${member.name}` : `Recorded ${member.name}’s dues` }
}

export async function deleteDues(id: string): Promise<ActionResult> {
  const { supabase } = await requireStaff()
  const { error } = await supabase.from('dues_payments').delete().eq('id', id)
  if (error) return failure(error)
  await log(supabase, 'removed a dues payment')
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

// ── Requests to join ────────────────────────────────────────────────────────

/**
 * A request to join, from the Join page, from anyone (as a message from Contact is). The
 * database turns it away while the club isn't taking members, or when that address already
 * has one waiting.
 */
export async function sendJoinRequest(form: FormData): Promise<ActionResult> {
  const parsed = parseJoinRequest(form)
  if (!parsed.ok) return parsed
  if (parsed.bot) return { ok: true }
  const supabase = createPublicClient()
  if (!supabase) return { ok: false, error: 'Requests can’t be sent from here right now.' }
  const { error } = await supabase.from('join_requests').insert(parsed.data)
  if (error)
    return { ok: false, error: error.code === 'P0001' ? error.message : error.code === '42501' ? 'We aren’t taking new members right now.' : 'Your request didn’t go through.' }
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

/** Makes whoever asked a member (new), or links the request to the member who already has that email */
export async function approveJoinRequest(id: string): Promise<ActionResult> {
  const { supabase, officer } = await requireStaff()
  const { data: request } = await supabase.from('join_requests').select('*').eq('id', id).maybeSingle()
  if (!request) return { ok: false, error: 'That request is gone; it may have been deleted.' }
  if (request.status === 'approved') return { ok: true, message: `${request.name} was already approved` }
  const { data: existing } = await supabase.from('members').select('id').eq('email', request.email).maybeSingle()
  let memberId = existing?.id ?? null
  if (!memberId) {
    const { data: added, error: addError } = await supabase
      .from('members')
      .insert({ name: request.name, email: request.email, major: request.major, year: request.year, status: 'new' })
      .select('id')
      .single()
    if (addError) return failure(addError, 'That email')
    memberId = added.id
  }
  const { error } = await supabase
    .from('join_requests')
    .update({ status: 'approved', member_id: memberId, handled_at: new Date().toISOString(), handled_by: officer.email })
    .eq('id', id)
  if (error) return failure(error)
  await log(supabase, 'approved the request to join from', request.name)
  revalidatePath('/dashboard', 'layout')
  return { ok: true, id: memberId, message: existing ? `${request.name} was already a member` : `Added ${request.name} to Members` }
}

/** Settles requests without adding anyone, or puts them back to waiting */
export async function setJoinRequestStatus(ids: string[], status: 'declined' | 'pending'): Promise<ActionResult> {
  const { supabase, officer } = await requireStaff()
  const { error } = await supabase
    .from('join_requests')
    .update(status === 'declined' ? { status, handled_at: new Date().toISOString(), handled_by: officer.email } : { status, handled_at: null, handled_by: null, member_id: null })
    .in('id', ids)
  if (error) return failure(error)
  await log(supabase, status === 'declined' ? 'declined' : 'reopened', `${ids.length} request${ids.length === 1 ? '' : 's'} to join`)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

export async function deleteJoinRequests(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireStaff()
  const { error } = await supabase.from('join_requests').delete().in('id', ids)
  if (error) return failure(error)
  await log(supabase, 'deleted', `${ids.length} request${ids.length === 1 ? '' : 's'} to join`)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

// ── RSVPs ───────────────────────────────────────────────────────────────────

/**
 * An RSVP to one of the club's own events, from the Events page, from anyone. The database
 * takes it only while the event is shown, still on, and not over; saying so twice is fine.
 */
export async function sendRsvp(form: FormData): Promise<ActionResult> {
  const parsed = parseRsvp(form)
  if (!parsed.ok) return parsed
  if (parsed.bot) return { ok: true }
  const supabase = createPublicClient()
  if (!supabase) return { ok: false, error: 'RSVPs can’t be taken from here right now.' }
  const { error } = await supabase.from('event_rsvps').insert(parsed.data)
  if (error && error.code !== '23505')
    return { ok: false, error: error.code === 'P0001' ? error.message : error.code === '42501' ? 'This event isn’t taking RSVPs anymore.' : 'Your RSVP didn’t go through.' }
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

export async function deleteRsvp(id: string): Promise<ActionResult> {
  const { supabase } = await requireStaff()
  const { error } = await supabase.from('event_rsvps').delete().eq('id', id)
  if (error) return failure(error)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

// ── Common questions ────────────────────────────────────────────────────────

export async function saveFaq(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parseFaq(form)
  if (!parsed.ok) return parsed
  const { data, error } = id
    ? await supabase.from('faqs').update(parsed.data).eq('id', id).select('id').maybeSingle()
    : await supabase
        .from('faqs')
        .insert({ ...parsed.data, sort: await nextSort(supabase, 'faqs') })
        .select('id')
        .single()
  if (error) return failure(error)
  if (!data) return { ok: false, error: 'That question is gone; it may have been removed.' }
  await log(supabase, id ? 'updated question' : 'added question', parsed.data.question)
  revalidateSite()
  return { ok: true, id: data.id, message: parsed.data.published ? 'Saved' : 'Saved (hidden from the site)' }
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('faqs').delete().eq('id', id).select('question').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed question', data?.question)
  revalidateSite()
  return { ok: true }
}

/** The questions in a new order, as dragged: first to last */
export async function reorderFaqs(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const results = await Promise.all(ids.map((id, i) => supabase.from('faqs').update({ sort: (i + 1) * 10 }).eq('id', id)))
  const failed = results.find((r) => r.error)?.error
  if (failed) return failure(failed)
  await log(supabase, 'reordered questions')
  revalidateSite()
  return { ok: true, message: 'Order saved' }
}

// ── Curated picks ───────────────────────────────────────────────────────────

/** The guides' own pages, and the dashboard's list */
const revalidatePicks = () => {
  revalidateSite()
  revalidatePath('/dashboard/picks')
}

/** A collection for one of the campus guides: a name, a line about it, and what's in it */
export async function saveGuidePick(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parseGuidePick(form)
  if (!parsed.ok) return parsed
  const { data, error } = id
    ? await supabase.from('guide_picks').update(parsed.data).eq('id', id).select('id').maybeSingle()
    : await supabase
        .from('guide_picks')
        .insert({ ...parsed.data, sort: await nextSort(supabase, 'guide_picks') })
        .select('id')
        .single()
  if (error) return failure(error)
  if (!data) return { ok: false, error: 'That collection is gone; it may have been removed.' }
  await log(supabase, id ? 'updated picks' : 'added picks', parsed.data.title)
  revalidatePicks()
  return { ok: true, id: data.id, message: parsed.data.published ? 'Saved' : 'Saved (hidden from the site)' }
}

export async function deleteGuidePick(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('guide_picks').delete().eq('id', id).select('title').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed picks', data?.title)
  revalidatePicks()
  return { ok: true }
}

/** The collections in a new order, as dragged: first to last */
export async function reorderGuidePicks(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const results = await Promise.all(ids.map((id, i) => supabase.from('guide_picks').update({ sort: (i + 1) * 10 }).eq('id', id)))
  const failed = results.find((r) => r.error)?.error
  if (failed) return failure(failed)
  await log(supabase, 'reordered picks')
  revalidatePicks()
  return { ok: true, message: 'Order saved' }
}

// ── Forwarded addresses ─────────────────────────────────────────────────────

export async function saveRedirect(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parseRedirect(form)
  if (!parsed.ok) return parsed
  const { data, error } = id
    ? await supabase.from('redirects').update(parsed.data).eq('id', id).select('id').maybeSingle()
    : await supabase.from('redirects').insert(parsed.data).select('id').single()
  if (error) return error.code === '23505' ? { ok: false, errors: { from_path: 'That address already forwards somewhere. Edit that one instead.' } } : failure(error)
  if (!data) return { ok: false, error: 'That redirect is gone; it may have been removed.' }
  await log(supabase, id ? 'updated redirect' : 'added redirect', parsed.data.from_path)
  revalidateSite()
  return { ok: true, id: data.id, message: `${parsed.data.from_path} forwards now` }
}

export async function deleteRedirect(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('redirects').delete().eq('id', id).select('from_path').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed redirect', data?.from_path)
  revalidateSite()
  return { ok: true }
}

// ── Minutes ─────────────────────────────────────────────────────────────────

export async function saveMinutes(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireStaff()
  const parsed = parseMinutes(form)
  if (!parsed.ok) return parsed
  const { data, error } = id
    ? await supabase.from('meeting_minutes').update(parsed.data).eq('id', id).select('id').maybeSingle()
    : await supabase.from('meeting_minutes').insert(parsed.data).select('id').single()
  if (error) return failure(error)
  if (!data) return { ok: false, error: 'Those minutes are gone; they may have been deleted.' }
  await log(supabase, id ? 'updated minutes for' : 'wrote minutes for', parsed.data.title)
  revalidatePath('/dashboard/minutes')
  return { ok: true, id: data.id, message: 'Saved' }
}

export async function deleteMinutes(id: string): Promise<ActionResult> {
  const { supabase } = await requireStaff()
  const { data, error } = await supabase.from('meeting_minutes').delete().eq('id', id).select('title').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'deleted minutes for', data?.title)
  revalidatePath('/dashboard/minutes')
  return { ok: true }
}

// ── Sponsors ────────────────────────────────────────────────────────────────

export async function saveSponsor(id: string | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const parsed = parseSponsor(form)
  if (!parsed.ok) return parsed
  const { data, error } = id
    ? await supabase.from('sponsors').update(parsed.data).eq('id', id).select('id').maybeSingle()
    : await supabase
        .from('sponsors')
        .insert({ ...parsed.data, sort: await nextSort(supabase, 'sponsors') })
        .select('id')
        .single()
  if (error) return failure(error)
  if (!data) return { ok: false, error: 'That sponsor is gone; it may have been removed.' }
  await log(supabase, id ? 'updated sponsor' : 'added sponsor', parsed.data.name)
  revalidateSite()
  return { ok: true, id: data.id, message: parsed.data.published ? 'Saved' : 'Saved (hidden from the site)' }
}

export async function deleteSponsor(id: string): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('sponsors').delete().eq('id', id).select('name').maybeSingle()
  if (error) return failure(error)
  await log(supabase, 'removed sponsor', data?.name)
  revalidateSite()
  return { ok: true }
}

/** The sponsors in a new order, as dragged: first to last */
export async function reorderSponsors(ids: string[]): Promise<ActionResult> {
  const { supabase } = await requireOfficer()
  const results = await Promise.all(ids.map((id, i) => supabase.from('sponsors').update({ sort: (i + 1) * 10 }).eq('id', id)))
  const failed = results.find((r) => r.error)?.error
  if (failed) return failure(failed)
  await log(supabase, 'reordered sponsors')
  revalidateSite()
  return { ok: true, message: 'Order saved' }
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
  const { error } = await supabase.from('officers').insert(parsed.data)
  if (error?.code === '23505') return { ok: false, errors: { email: 'They’re already on the list. Edit them there instead.' } }
  if (error) return failure(error)
  await log(supabase, 'gave dashboard access to', parsed.data.name ?? parsed.data.email)
  revalidatePath('/dashboard/settings')
  return { ok: true, message: `${parsed.data.email} can sign in now` }
}

/** Changes an officer's name, title, or role. Their email is who they sign in as, so it stays. */
export async function updateOfficer(email: string, form: FormData): Promise<ActionResult> {
  const { supabase, officer } = await requireAdmin()
  const parsed = parseOfficer(form)
  if (!parsed.ok) return parsed
  const { name, title, role } = parsed.data
  // Whoever's acting stays an admin, so the club can't end up with none
  if (email.toLowerCase() === officer.email.toLowerCase() && role !== officer.role) return { ok: false, error: 'You can’t change your own role; ask another admin.' }
  const { data, error } = await supabase.from('officers').update({ name, title, role }).eq('email', email).select('email')
  if (error) return failure(error)
  if (!data.length) return { ok: false, error: 'They’re not on the officer list anymore.' }
  await log(supabase, 'updated', name ?? email)
  revalidatePath('/dashboard/settings')
  return { ok: true, message: `Saved ${name ?? email}` }
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

/** Whether a post, page, or presentation web address is free (ignoring the one being edited) */
export async function checkSlug(kind: 'post' | 'page' | 'presentation', slug: string, exceptId: string | null): Promise<{ ok: true } | { ok: false; message: string }> {
  const { supabase } = await requireOfficer()
  const table = kind === 'post' ? 'posts' : kind === 'page' ? 'pages' : 'presentations'
  let query = supabase.from(table).select('id', { count: 'exact', head: true }).eq('slug', slug)
  if (exceptId) query = query.neq('id', exceptId)
  const { count, error } = await query
  if (error) return { ok: false, message: 'Couldn’t check; saving will tell you if it’s taken.' }
  return count ? { ok: false, message: `Another ${kind} already uses this address.` } : { ok: true }
}
