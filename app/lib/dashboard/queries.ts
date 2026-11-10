import { getUpcomingEvents, type ClubEvent } from '@/lib/data/events'
import { atlantaToday } from '@/lib/eateries'
import { BUILT_IN_EVENTS, eventFromRow, splitEvents } from '@/lib/events'
import { SITE_PAGES } from '@/lib/sitePages'

import type { PageRow, PostRow } from '@/lib/supabase/types'

import { attendanceByMember } from './attendance'
import { requireOfficer, requireStaff } from './dal'
import { mediaUsage } from './mediaUsage'
import { currentTerm } from './terms'

/**
 * What the dashboard pages read. Each call checks the officer first (cached per request,
 * so several calls on one page check once) and reads as them.
 */

const must = <T>(result: { data: T | null; error: { message: string } | null }): T => {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

/** A read a page can do without: empty if it fails (a table whose migration hasn't run, say) */
const orEmpty = <T>(result: { data: T[] | null; error: unknown }): T[] => (result.error ? [] : (result.data ?? []))

export async function listMembers() {
  const { supabase } = await requireStaff()
  return must(await supabase.from('members').select('*').order('name'))
}

/** What each member has come to, for the Members table */
export async function listMemberAttendance() {
  const { supabase } = await requireStaff()
  return attendanceByMember(must(await supabase.from('event_checkins').select('member_id, event_id, checked_in_at').not('member_id', 'is', null)))
}

/** One member and the events they've come to, newest first; null if there's no such member */
export async function getMemberProfile(id: string) {
  const { supabase } = await requireStaff()
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const member = must(await supabase.from('members').select('*').eq('id', id).maybeSingle())
  if (!member) return null
  const [checkins, { upcoming, past }] = await Promise.all([
    supabase.from('event_checkins').select('*').eq('member_id', id).order('checked_in_at', { ascending: false }),
    listEvents(),
  ])
  const events = new Map([...upcoming, ...past].map((e) => [e.id, e.name]))
  return {
    member,
    history: must(checkins).map((c) => ({
      id: c.id,
      eventId: c.event_id,
      eventName: c.event_name ?? events.get(c.event_id) ?? null,
      linked: events.has(c.event_id),
      checkedInAt: c.checked_in_at,
    })),
  }
}

/** The club's own events as they're kept, hidden ones too, newest first */
export async function listEventRows() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('events').select('*').order('starts_at', { ascending: false }))
}

/**
 * Every event the club has: upcoming ones (PIN's and the dashboard's), soonest first, then
 * past ones, newest first. The built-in past events stand in until the dashboard has any.
 */
export async function listEvents(): Promise<{ upcoming: ClubEvent[]; past: ClubEvent[] }> {
  // Before the events migration is applied there's no table, and check-ins still need the list
  const [pin, rows] = await Promise.all([getUpcomingEvents().catch(() => []), listEventRows().catch(() => [])])
  return splitEvents(rows.length ? rows.map(eventFromRow) : BUILT_IN_EVENTS, pin)
}

export async function listExecutives() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('executives').select('*').order('last_name'))
}

export async function listAffiliates() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('affiliates').select('*').order('sort').order('short_name'))
}

export async function listConnections() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('map_connections').select('*').order('sort').order('name'))
}

/** Messages from the Contact page, newest first */
export async function listMessages() {
  const { supabase } = await requireStaff()
  return must(await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }))
}

/** How many messages nobody has opened; 0 before the messages migration runs */
export async function unreadMessageCount() {
  const { supabase } = await requireOfficer()
  const { count, error } = await supabase.from('contact_messages').select('id', { count: 'exact', head: true }).is('read_at', null)
  return error ? 0 : (count ?? 0)
}

/** Check-in counts by event id */
export async function checkinCounts() {
  const { supabase } = await requireOfficer()
  const rows = must(await supabase.from('event_checkins').select('event_id'))
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1)
  return counts
}

export async function getEventWithCheckins(id: string) {
  const { supabase } = await requireStaff()
  const { upcoming, past } = await listEvents()
  const event = [...upcoming, ...past].find((e) => e.id === id) ?? null
  const checkins = must(await supabase.from('event_checkins').select('*').eq('event_id', id).order('checked_in_at', { ascending: false }))
  const members = must(await supabase.from('members').select('id, name, email').order('name'))
  // Both newer than check-ins: before their migration runs, no RSVPs, and guests as they always were
  const [rsvps, settings] = await Promise.all([
    supabase.from('event_rsvps').select('*').eq('event_id', id).order('created_at'),
    supabase.from('club_settings').select('walkins_allowed').eq('id', 1).maybeSingle(),
  ])
  return { event, checkins, members, rsvps: orEmpty(rsvps), walkinsAllowed: settings.data?.walkins_allowed ?? true }
}

export async function getOverview() {
  const { supabase } = await requireOfficer()
  const [members, checkins, posts, pages, activity, events, eateries, closures, unread] = await Promise.all([
    supabase.from('members').select('id, name, status, joined_on'),
    supabase.from('event_checkins').select('member_id, event_id, event_name, checked_in_at'),
    supabase.from('posts').select('id, title, status, updated_at, publish_at, review_requested'),
    supabase.from('pages').select('id, title, status, updated_at, review_requested'),
    supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(12),
    listEvents(),
    supabase.from('eateries').select('id, name, checked_on').eq('published', true),
    supabase.from('eatery_closures').select('id, label, starts_on, ends_on, eateries').gte('ends_on', atlantaToday()),
    unreadMessageCount(),
  ])
  const names = new Map([...events.upcoming, ...events.past].map((e) => [e.id, e.name]))
  return {
    members: must(members),
    checkins: must(checkins).map((c) => ({ ...c, event_name: c.event_name ?? names.get(c.event_id) ?? null })),
    posts: must(posts),
    pages: must(pages),
    activity: must(activity),
    upcoming: events.upcoming,
    eateries: orEmpty(eateries),
    closures: orEmpty(closures),
    unread,
  }
}

/** Which posts, pages, and homepage use each file in the media bucket: path to titles */
export async function getMediaUsage() {
  const { supabase } = await requireOfficer()
  const [posts, pages, homepage] = await Promise.all([
    supabase.from('posts').select('title, cover_image_url, body'),
    supabase.from('pages').select('title, share_image_url, body, sections'),
    supabase.from('homepage').select('content'),
  ])
  return mediaUsage([
    ...must(posts).map(({ title, ...fields }) => ({ title, fields })),
    ...must(pages).map(({ title, ...fields }) => ({ title, fields })),
    ...must(homepage).map(({ content }) => ({ title: 'the homepage', fields: content })),
  ])
}

export async function listPosts() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('posts').select('id, slug, title, status, published_at, publish_at, unpublish_at, category, featured, review_requested, review_note, updated_at, author_email').order('updated_at', { ascending: false }))
}

export async function getPost(id: string) {
  const { supabase } = await requireOfficer()
  return must<PostRow | null>(await supabase.from('posts').select('*').eq('id', id).maybeSingle())
}

export async function listPages() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('pages').select('id, slug, title, status, updated_at, updated_by, publish_at, unpublish_at, review_requested, review_note').order('title'))
}

export async function getPage(id: string) {
  const { supabase } = await requireOfficer()
  return must<PageRow | null>(await supabase.from('pages').select('*').eq('id', id).maybeSingle())
}

export async function listPlaces() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('map_places').select('*').order('name'))
}

/** Every eatery (shown or hidden), the areas in the page's order, and every closure, latest first */
export async function listEateries() {
  const { supabase } = await requireOfficer()
  const [eateries, areas, closures] = await Promise.all([
    supabase.from('eateries').select('*').order('area').order('sort').order('name'),
    supabase.from('eatery_areas').select('*').order('sort').order('title'),
    supabase.from('eatery_closures').select('*').order('ends_on', { ascending: false }),
  ])
  return { eateries: must(eateries), areas: must(areas), closures: must(closures) }
}

/** Every resource (shown or hidden) and the groups, in the page's order */
export async function listResources() {
  const { supabase } = await requireOfficer()
  const [resources, groups] = await Promise.all([
    supabase.from('resources').select('*').order('sort').order('label'),
    supabase.from('resource_groups').select('*').order('sort').order('title'),
  ])
  return { resources: must(resources), groups: must(groups) }
}

/** The homepage row, or null before its migration runs (the screen says so instead of failing) */
export async function getHomepageRow() {
  const { supabase } = await requireOfficer()
  const { data, error } = await supabase.from('homepage').select('*').eq('id', 1).maybeSingle()
  return error ? null : data
}

/**
 * The tab titles officers set (null before their migration runs), and which of the site's
 * own pages are published from Pages (their own titles win there)
 */
export async function getPageMeta() {
  const { supabase } = await requireOfficer()
  const [meta, pages] = await Promise.all([
    supabase.from('page_meta').select('*'),
    supabase.from('pages').select('id, slug, title, description').eq('status', 'published').in('slug', Object.keys(SITE_PAGES)),
  ])
  return { rows: meta.error ? null : meta.data, managed: must(pages) }
}

export async function getSettings() {
  const { supabase } = await requireOfficer()
  const [settings, officers, terms] = await Promise.all([
    supabase.from('club_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('officers').select('*').order('role').order('email'),
    supabase.from('terms').select('*').order('starts_on', { ascending: false }),
  ])
  return { settings: must(settings), officers: must(officers), terms: orEmpty(terms) }
}

// ── Terms and dues ──────────────────────────────────────────────────────────

/** Everyone who could owe dues, every term (newest first), every payment, and what dues cost */
export async function listDues() {
  const { supabase } = await requireStaff()
  const [members, terms, payments, settings] = await Promise.all([
    supabase.from('members').select('id, name, email, status').order('name'),
    supabase.from('terms').select('*').order('starts_on', { ascending: false }),
    supabase.from('dues_payments').select('*'),
    supabase.from('club_settings').select('dues_amount').eq('id', 1).maybeSingle(),
  ])
  return { members: must(members), terms: must(terms), payments: must(payments), duesAmount: settings.data?.dues_amount ?? null }
}

/** Who's paid for the term today falls in, for the Members table; null with no terms yet (or before their migration) */
export async function currentTermDues() {
  const { supabase } = await requireStaff()
  const term = currentTerm(orEmpty(await supabase.from('terms').select('id, name, starts_on, ends_on')), atlantaToday())
  if (!term) return null
  const payments = orEmpty(await supabase.from('dues_payments').select('member_id').eq('term_id', term.id))
  return { term: term.name, paid: payments.map((p) => p.member_id) }
}

// ── Requests to join, and RSVPs ─────────────────────────────────────────────

/** Requests from the Join page, newest first */
export async function listJoinRequests() {
  const { supabase } = await requireStaff()
  return must(await supabase.from('join_requests').select('*').order('created_at', { ascending: false }))
}

/** How many requests nobody has settled; 0 for an editor, and before the migration runs */
export async function pendingRequestCount() {
  const { supabase } = await requireOfficer()
  const { count, error } = await supabase.from('join_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  return error ? 0 : (count ?? 0)
}

// ── Questions, redirects, minutes, sponsors ─────────────────────────────────

/** /about's common questions, shown or hidden, in the page's order */
export async function listFaqs() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('faqs').select('*').order('sort').order('question'))
}

export async function listRedirects() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('redirects').select('*').order('from_path'))
}

/** Meeting minutes, newest first */
export async function listMinutes() {
  const { supabase } = await requireStaff()
  return must(await supabase.from('meeting_minutes').select('*').order('held_on', { ascending: false }))
}

export async function listSponsors() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('sponsors').select('*').order('sort').order('name'))
}
