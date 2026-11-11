/**
 * CSEG's own events: the ones that aren't on PIN as Public. Edited in the dashboard (the
 * events table); the list in ./data/events is what the site shows until it has any, and
 * what seeds it. PIN's upcoming events are read from PIN and shown alongside.
 */
import { slugify } from '../components/Form/Slug/slugify'
import { PAST_EVENTS, type ClubEvent } from './data/events'
import type { ClubEventRow, Database } from './supabase/types'

export const BUILT_IN_EVENTS: readonly ClubEvent[] = PAST_EVENTS

/** An event's id from its name and the day it starts, "the-hub-2026-04-23"; kept once made */
export const eventSlug = (name: string, startIso: string) => {
  const day = new Date(startIso).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const base = slugify(name)
  return base && /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${base}-${day}` : ''
}

export const eventFromRow = (row: ClubEventRow): ClubEvent => ({
  id: row.slug,
  name: row.name,
  start: row.starts_at,
  end: row.ends_at,
  location: row.location ?? undefined,
  description: row.description,
  href: row.href ?? undefined,
  imageSrc: row.image_url ?? undefined,
  imageAlt: row.image_alt ?? undefined,
  cancelled: row.status === 'cancelled' || undefined,
  tags: row.tags?.length ? row.tags : undefined,
  onlineUrl: row.online_url ?? undefined,
  sessions: row.sessions?.length > 1 ? row.sessions.map((s) => ({ start: s.start, end: s.end, location: s.location ?? undefined })) : undefined,
  // With a PIN page, RSVPs are PIN's; without one, the site takes them
  rsvp: row.href ? undefined : true,
})

export const eventToRow = (e: ClubEvent): Database['public']['Tables']['events']['Insert'] => ({
  slug: e.id,
  name: e.name,
  starts_at: e.start,
  ends_at: e.end,
  location: e.location ?? null,
  description: e.description,
  href: e.href ?? null,
  image_url: e.imageSrc ?? null,
  image_alt: e.imageAlt ?? null,
  status: e.cancelled ? 'cancelled' : 'scheduled',
  tags: [...(e.tags ?? [])],
  online_url: e.onlineUrl ?? null,
  sessions: e.sessions?.length ? e.sessions.map((s) => ({ start: s.start, end: s.end, location: s.location ?? null })) : [],
  published: true,
})

/** Every time and place an event meets, soonest first: its sessions, or its one time and place */
export const eventSessions = (e: ClubEvent) => (e.sessions?.length ? e.sessions : [{ start: e.start, end: e.end, location: e.location }])

/** Where an event is now: called off, on right now (one of its sessions is), over, or still to come */
export const eventState = (e: ClubEvent, now = Date.now()): 'cancelled' | 'live' | 'ended' | 'upcoming' => {
  if (e.cancelled) return 'cancelled'
  if (eventSessions(e).some((s) => Date.parse(s.start) <= now && now < Date.parse(s.end))) return 'live'
  return Date.parse(e.end) <= now ? 'ended' : 'upcoming'
}

/**
 * The club's events with PIN's upcoming ones: what hasn't ended yet, soonest first, and
 * what has, newest first. An event on both (the same PIN page) shows once, as PIN has it.
 */
export const splitEvents = (own: readonly ClubEvent[], pin: readonly ClubEvent[], now = Date.now()) => {
  const onPin = new Set(pin.map((e) => e.href).filter(Boolean))
  const mine = own.filter((e) => !(e.href && onPin.has(e.href) && Date.parse(e.end) > now))
  return {
    upcoming: [...pin, ...mine.filter((e) => Date.parse(e.end) > now)].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
    past: mine.filter((e) => Date.parse(e.end) <= now).sort((a, b) => Date.parse(b.start) - Date.parse(a.start)),
  }
}

/** The term an event fell in, on Atlanta's calendar: "Spring 2026" (January–May), "Summer 2026" (June–July), "Fall 2025" (August–December) */
export const eventTerm = (startIso: string) => {
  const [year, month] = new Date(startIso).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).split('-').map(Number)
  return `${month <= 5 ? 'Spring' : month <= 7 ? 'Summer' : 'Fall'} ${year}`
}

/** Events by term, in the order given (so newest-first events make newest-first terms) */
export const groupByTerm = <E extends Pick<ClubEvent, 'start'>>(events: readonly E[]): { term: string; events: E[] }[] => {
  const groups: { term: string; events: E[] }[] = []
  for (const e of events) {
    const term = eventTerm(e.start)
    const last = groups[groups.length - 1]
    if (last?.term === term) last.events.push(e)
    else groups.push({ term, events: [e] })
  }
  return groups
}
