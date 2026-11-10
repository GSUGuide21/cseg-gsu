/**
 * What the Overview works out from the club's data: what needs an officer's attention, and
 * how members keep coming back. Pure, so it's tested without a database.
 */

const DAY = 86_400_000

/** A draft left this long is probably forgotten */
export const STALE_DRAFT_DAYS = 30
/** An eatery's hours want checking this often */
export const EATERY_CHECK_DAYS = 90
/** Closures starting this soon get a heads-up */
export const CLOSURE_SOON_DAYS = 14
/** An active member unseen at events this long may have drifted off */
export const LAPSED_DAYS = 90

type Doc = { id: string; title: string; status: string; updated_at: string; review_requested: boolean }

export type AttentionItem = {
  id: string
  /** "3 unread messages" */
  title: string
  /** Who or what, in a line */
  detail?: string
  href: string
  tone: 'warning' | 'info' | 'brand'
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const names = (list: readonly string[], max = 3) => (list.length > max ? `${list.slice(0, max).join(', ')}, and ${list.length - max} more` : list.join(', '))
const daysBetween = (from: string, to: number) => Math.floor((to - Date.parse(from)) / DAY)

/** Days from one "YYYY-MM-DD" to another */
const dateDays = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY)

export function needsAttention({
  unread,
  posts,
  pages,
  eateries,
  closures,
  now,
  today,
}: {
  unread: number
  posts: readonly Doc[]
  pages: readonly Doc[]
  eateries: readonly { id: string; name: string; checked_on: string | null }[]
  closures: readonly { id: string; label: string; starts_on: string; ends_on: string }[]
  now: number
  /** Atlanta's "YYYY-MM-DD" */
  today: string
}): AttentionItem[] {
  const items: AttentionItem[] = []
  if (unread) items.push({ id: 'messages', title: `${plural(unread, 'unread message')}`, detail: 'From the Contact page', href: '/dashboard/messages', tone: 'brand' })

  const docs = [...posts.map((d) => ({ ...d, kind: 'post' as const })), ...pages.map((d) => ({ ...d, kind: 'page' as const }))]
  const hrefOf = (d: (typeof docs)[number]) => `/dashboard/${d.kind}s/${d.id}`

  const review = docs.filter((d) => d.review_requested && d.status !== 'published')
  if (review.length)
    items.push({
      id: 'review',
      title: `${plural(review.length, 'draft')} waiting for review`,
      detail: names(review.map((d) => d.title)),
      href: review.length === 1 ? hrefOf(review[0]) : review.every((d) => d.kind === 'page') ? '/dashboard/pages' : '/dashboard/posts',
      tone: 'warning',
    })

  const stale = docs.filter((d) => d.status === 'draft' && !d.review_requested && daysBetween(d.updated_at, now) >= STALE_DRAFT_DAYS).sort((a, b) => a.updated_at.localeCompare(b.updated_at))
  if (stale.length)
    items.push({
      id: 'stale',
      title: `${plural(stale.length, 'draft')} untouched for ${STALE_DRAFT_DAYS}+ days`,
      detail: names(stale.map((d) => d.title)),
      href: stale.length === 1 ? hrefOf(stale[0]) : stale.every((d) => d.kind === 'page') ? '/dashboard/pages' : '/dashboard/posts',
      tone: 'info',
    })

  const unchecked = eateries.filter((e) => !e.checked_on || dateDays(e.checked_on, today) >= EATERY_CHECK_DAYS)
  if (unchecked.length)
    items.push({
      id: 'eateries',
      title: `${plural(unchecked.length, 'eatery', 'eateries')} with hours to check`,
      detail: `Not checked in ${EATERY_CHECK_DAYS} days: ${names(unchecked.map((e) => e.name))}`,
      href: '/dashboard/eateries',
      tone: 'info',
    })

  const soon = closures.filter((c) => c.starts_on > today && dateDays(today, c.starts_on) <= CLOSURE_SOON_DAYS).sort((a, b) => a.starts_on.localeCompare(b.starts_on))
  if (soon.length)
    items.push({
      id: 'closures',
      title: `${plural(soon.length, 'closure')} starting soon`,
      detail: soon.map((c) => `${c.label} (in ${plural(dateDays(today, c.starts_on), 'day')})`).join(', '),
      href: '/dashboard/eateries',
      tone: 'info',
    })

  return items
}

export type Engagement = {
  /** Members who've checked in at all */
  attendees: number
  /** Of those, how many came to two or more events */
  returning: number
  /** Active members not seen at an event in LAPSED_DAYS (or ever, once they've been members that long), longest gone first */
  lapsed: { id: string; name: string; lastSeen: string | null }[]
  /** The busiest events of the last six months */
  topEvents: { id: string; name: string; count: number }[]
}

export function engagement({
  members,
  checkins,
  now,
}: {
  members: readonly { id: string; name: string; status: string; joined_on: string }[]
  checkins: readonly { member_id: string | null; event_id: string; event_name: string | null; checked_in_at: string }[]
  now: number
}): Engagement {
  const events = new Map<string, Set<string>>()
  const lastSeen = new Map<string, string>()
  for (const c of checkins) {
    if (!c.member_id) continue
    events.set(c.member_id, (events.get(c.member_id) ?? new Set()).add(c.event_id))
    const seen = lastSeen.get(c.member_id)
    if (!seen || c.checked_in_at > seen) lastSeen.set(c.member_id, c.checked_in_at)
  }

  const lapsed = members
    .filter((m) => m.status === 'active')
    .map((m) => ({ id: m.id, name: m.name, lastSeen: lastSeen.get(m.id) ?? null, since: lastSeen.get(m.id) ?? m.joined_on }))
    .filter((m) => daysBetween(m.since, now) >= LAPSED_DAYS)
    .sort((a, b) => a.since.localeCompare(b.since))
    .map(({ id, name, lastSeen }) => ({ id, name, lastSeen }))

  const counts = new Map<string, { name: string; count: number }>()
  for (const c of checkins) {
    if (now - Date.parse(c.checked_in_at) > 183 * DAY) continue
    const entry = counts.get(c.event_id) ?? { name: c.event_name ?? c.event_id, count: 0 }
    entry.count++
    counts.set(c.event_id, entry)
  }

  return {
    attendees: events.size,
    returning: [...events.values()].filter((s) => s.size >= 2).length,
    lapsed,
    topEvents: [...counts]
      .map(([id, e]) => ({ id, ...e }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 5),
  }
}
