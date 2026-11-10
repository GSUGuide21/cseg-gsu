export type ClubEvent = {
  readonly id: string
  readonly name: string
  /** ISO timestamps with offset: its first start and its last end, when it meets more than once */
  readonly start: string
  readonly end: string
  /** Where it is (its first place, when it meets in more than one) */
  readonly location?: string
  readonly description: string
  /** PIN event page (RSVP) */
  readonly href?: string
  readonly imageSrc?: string
  /** What the picture says, for screen readers; a flyer's restates its key text */
  readonly imageAlt?: string
  /** Called off: still listed, marked so */
  readonly cancelled?: boolean
  readonly tags?: readonly string[]
  /** Where to join it online */
  readonly onlineUrl?: string
  /** Every time and place it meets, when there's more than one */
  readonly sessions?: readonly { readonly start: string; readonly end: string; readonly location?: string }[]
  /** One of the dashboard's events with no PIN page: people RSVP on the site */
  readonly rsvp?: boolean
}

/** CSEG's organization id on PIN (pin.gsu.edu/organization/cseg). */
export const PIN_ORGANIZATION_ID = 351802

const PIN_EVENT_SEARCH = `https://pin.gsu.edu/api/discovery/event/search?organizationIds%5B0%5D=${PIN_ORGANIZATION_ID}&orderByField=endsOn&orderByDirection=ascending&take=50`

/**
 * Past events, from the @cseg_gsu Instagram posts and the club's flyers. PIN's public
 * search only returns events whose visibility is Public, so older CSEG events aren't there.
 * Newest first.
 */
export const PAST_EVENTS: readonly ClubEvent[] = [
  {
    id: 'the-hub-2026-04',
    name: 'The Hub: Bring Your Talent!',
    start: '2026-04-23T14:00:00-04:00',
    end: '2026-04-23T15:30:00-04:00',
    location: 'Student Center West 466/468',
    description: 'A creative, fun space for students to express themselves: poetry, spoken word, singing, dance, karaoke, art, and more.',
  },
  {
    id: 'vibez-talk-2026-04',
    name: 'Vibez Talk',
    start: '2026-04-09T13:00:00-04:00',
    end: '2026-04-09T15:00:00-04:00',
    location: 'Student Center West 460',
    description:
      'The dialogue series on pop culture, hot-button issues, and current events: a safe space to bring different perspectives, interests, and experiences to the conversation.',
  },
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
    id: 'on-the-hunt-2026-03',
    name: 'On the Hunt… for Campus Resources!',
    start: '2026-03-05T13:30:00-05:00',
    end: '2026-03-05T15:00:00-05:00',
    location: 'Student Center West 258',
    description:
      'A discussion of the valuable student resources at GSU, including the Office of the Dean of Students and Student Organization Services, with insights shared and free food.',
  },
  {
    id: 'vibez-talk-2026-02',
    name: 'Vibez Talk',
    start: '2026-02-26T13:00:00-05:00',
    end: '2026-02-26T14:30:00-05:00',
    location: 'Student Center West 259',
    description:
      'The dialogue series on pop culture, hot-button issues, and current events: a safe space to bring different perspectives, interests, and experiences to the conversation.',
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
  {
    id: 'the-hub-2025-10',
    name: 'The Hub: Bring In Your Talent!',
    start: '2025-10-22T15:00:00-04:00',
    end: '2025-10-22T16:30:00-04:00',
    location: 'Student Center West 466/468',
    description: 'A creative space for GSU students to make connections through spoken word, music, art, public speaking, and more.',
  },
  {
    id: 'vybez-talks-2025-10',
    name: 'Vybez Talks (Pilot)',
    start: '2025-10-09T14:00:00-04:00',
    end: '2025-10-09T15:30:00-04:00',
    location: 'Student Center West 468',
    description:
      'The pilot of CSEG’s discussion series, on pop culture, modern events, and hot-button issues, bringing different perspectives, interests, and experiences to the conversation.',
  },
  {
    id: 'campus-roundtable-2025-03',
    name: 'The Campus Roundtable (Pilot)',
    start: '2025-03-06T13:00:00-05:00',
    end: '2025-03-06T15:00:00-05:00',
    location: 'Speakers’ Auditorium, Student Center East',
    description:
      'A discussion of what’s happening on campus: campus safety, faculty and staff, food and grocery options, the social atmosphere, housing options, commuting, and accessibility.',
  },
  {
    id: 'how-to-make-friends-2025-02',
    name: 'How to Make Friends',
    start: '2025-02-13T13:00:00-05:00',
    end: '2025-02-13T15:00:00-05:00',
    location: 'Student Center West 460',
    description:
      'Ways to meet new people on campus, and an introduction to CSEG for prospective members: what friendship is, social spots and platforms for meeting people, and building meaningful relationships through etiquette, boundaries, trust, and empathy.',
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
