export type ClubEvent = {
  readonly id: string
  readonly name: string
  /** ISO timestamps with offset */
  readonly start: string
  readonly end: string
  readonly location?: string
  readonly description: string
  /** PIN event page (RSVP) */
  readonly href?: string
  readonly imageSrc?: string
}

/** CSEG's organization id on PIN (pin.gsu.edu/organization/cseg). */
export const PIN_ORGANIZATION_ID = 351802

const PIN_EVENT_SEARCH = `https://pin.gsu.edu/api/discovery/event/search?organizationIds%5B0%5D=${PIN_ORGANIZATION_ID}&orderByField=endsOn&orderByDirection=ascending&take=50`

/**
 * Past events, from the @cseg_gsu Instagram posts. PIN's public search only
 * returns events whose visibility is Public, so older CSEG events aren't there.
 * Newest first.
 */
export const PAST_EVENTS: readonly ClubEvent[] = [
  {
    id: 'vibez-talk-2026-03',
    name: 'Vibez Talk',
    start: '2026-03-26T13:00:00-04:00',
    end: '2026-03-26T14:30:00-04:00',
    location: 'Student Center West 259',
    description:
      'An open discussion for Georgia State students, with free food. Anyone interested in joining the conversation was welcome.',
    href: 'https://pin.gsu.edu/event/12277138',
  },
  {
    id: 'the-hub-2025-12',
    name: 'The Hub: Bring Your Talent!',
    start: '2025-12-04T15:30:00-05:00',
    end: '2025-12-04T16:30:00-05:00',
    location: 'Student Center West 466/468',
    description:
      'A talent showcase for poetry, singing, dancing, public speaking, and more. Students came to perform or to watch, with line dances to close and free food.',
  },
]

type PinEvent = {
  id: number
  name: string
  description: string | null
  location: string | null
  startsOn: string
  endsOn: string
  imagePath: string | null
}

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * CSEG's public PIN events that haven't ended yet, soonest first.
 * Cached for an hour; returns [] if PIN is unreachable so the page still renders.
 */
export async function getUpcomingEvents(now = Date.now()): Promise<ClubEvent[]> {
  try {
    const res = await fetch(PIN_EVENT_SEARCH, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data: { value?: PinEvent[] } = await res.json()
    return (data.value ?? [])
      .filter((e) => Date.parse(e.endsOn) > now)
      .map((e) => ({
        id: `pin-${e.id}`,
        name: e.name,
        start: e.startsOn,
        end: e.endsOn,
        location: e.location ?? undefined,
        description: stripHtml(e.description ?? ''),
        href: `https://pin.gsu.edu/event/${e.id}`,
        imageSrc: e.imagePath
          ? `https://se-images.campuslabs.com/clink/images/${e.imagePath}?preset=med-w`
          : undefined,
      }))
  } catch {
    return []
  }
}
