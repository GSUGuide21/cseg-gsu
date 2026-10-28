import { getUpcomingEvents, PAST_EVENTS, type ClubEvent } from '@/lib/data/events'

import type { PageRow, PostRow } from '@/lib/supabase/types'

import { requireOfficer } from './dal'

/**
 * What the dashboard pages read. Each call checks the officer first (cached per request,
 * so several calls on one page check once) and reads as them.
 */

const must = <T>(result: { data: T | null; error: { message: string } | null }): T => {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}

export async function listMembers() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('members').select('*').order('name'))
}

/** Every event the club has: upcoming ones from PIN, then past ones, newest first */
export async function listEvents(): Promise<{ upcoming: ClubEvent[]; past: ClubEvent[] }> {
  const upcoming = await getUpcomingEvents().catch(() => [])
  const past = [...PAST_EVENTS].sort((a, b) => b.start.localeCompare(a.start))
  return { upcoming, past }
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
  const { supabase } = await requireOfficer()
  const { upcoming, past } = await listEvents()
  const event = [...upcoming, ...past].find((e) => e.id === id) ?? null
  const checkins = must(await supabase.from('event_checkins').select('*').eq('event_id', id).order('checked_in_at', { ascending: false }))
  const members = must(await supabase.from('members').select('id, name, email').order('name'))
  return { event, checkins, members }
}

export async function getOverview() {
  const { supabase } = await requireOfficer()
  const [members, checkins, posts, activity, events] = await Promise.all([
    supabase.from('members').select('status, joined_on'),
    supabase.from('event_checkins').select('checked_in_at'),
    supabase.from('posts').select('status'),
    supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(12),
    listEvents(),
  ])
  return {
    members: must(members),
    checkins: must(checkins),
    posts: must(posts),
    activity: must(activity),
    upcoming: events.upcoming,
  }
}

export async function listPosts() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('posts').select('id, slug, title, status, published_at, updated_at, author_email').order('updated_at', { ascending: false }))
}

export async function getPost(id: string) {
  const { supabase } = await requireOfficer()
  return must<PostRow | null>(await supabase.from('posts').select('*').eq('id', id).maybeSingle())
}

export async function listPages() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('pages').select('id, slug, title, status, updated_at, updated_by').order('title'))
}

export async function getPage(id: string) {
  const { supabase } = await requireOfficer()
  return must<PageRow | null>(await supabase.from('pages').select('*').eq('id', id).maybeSingle())
}

export async function listPlaces() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('map_places').select('*').order('name'))
}

/** Every eatery, shown or hidden, by area and then each area's order */
export async function listEateries() {
  const { supabase } = await requireOfficer()
  return must(await supabase.from('eateries').select('*').order('area').order('sort').order('name'))
}

export async function getSettings() {
  const { supabase } = await requireOfficer()
  const [settings, officers] = await Promise.all([
    supabase.from('club_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('officers').select('*').order('role').order('email'),
  ])
  return { settings: must(settings), officers: must(officers) }
}
