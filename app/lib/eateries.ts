/**
 * Places to eat: their shape, the areas they're grouped in, and closures for breaks.
 * The eateries, areas, and closures are edited in the dashboard (their tables); the list in
 * ./data/eats and BUILT_IN_AREAS are what the site shows until the tables have any, and what
 * seeds them.
 */
import type { HoursRange, Schedule } from './hours'
import type { Database, EateryAreaRow, EateryClosureRow, EateryRow } from './supabase/types'

type EateryInsert = Database['public']['Tables']['eateries']['Insert']

/** An area's slug: its #link on the page, and what References point at */
export type EatArea = string

/** An area places to eat are grouped in, as the page shows it */
export type EateryArea = { readonly slug: EatArea; readonly title: string; readonly description?: string }

/** The areas the site starts with (the eatery_areas table starts as these), in the page's order */
export const BUILT_IN_AREAS: readonly EateryArea[] = [
  { slug: 'campus', title: 'On campus', description: 'Run by PantherDining. Pay with PantherCash, PantherMeals, or a card.' },
  { slug: 'park-place', title: 'Park Place, Edgewood, Hurt Plaza & Decatur Street' },
  { slug: 'broad-peachtree', title: 'Broad Street & Peachtree Street' },
  { slug: 'luckie-forsyth', title: 'Luckie Street, Forsyth Street & downtown core' },
  {
    slug: 'peachtree-center',
    title: 'The Hub at Peachtree Center',
    description:
      'Food court under Peachtree Center, connected to the Peachtree Center MARTA station. Mostly a weekday lunch scene: many counters close early evening and on weekends.',
  },
  { slug: 'piedmont-auburn', title: 'Piedmont Avenue, Auburn Avenue & Sweet Auburn' },
]

export const findArea = (areas: readonly EateryArea[], slug: string) => areas.find((a) => a.slug === slug)

export type EateryLocation = {
  readonly id: string
  readonly label: string
  readonly lat: number
  readonly lng: number
  readonly schedule?: Schedule
}

export type Eatery = {
  /** Its map pin's id and its #link on the page */
  readonly id: string
  readonly name: string
  readonly area: EatArea
  readonly address: string
  readonly description: string
  /** As listed by an official source; omitted when we couldn't confirm */
  readonly hours?: string
  /** Machine-readable version of `hours`, for "Open now" */
  readonly schedule?: Schedule
  /** Short heads-up shown as a badge, e.g. "Closed for maintenance" */
  readonly status?: string
  readonly note?: string
  /** Own map pin. Campus spots sit a few meters off their building's pin so both stay clickable. */
  readonly lat?: number
  readonly lng?: number
  /** One pin per location, for a listing with several (e.g. Costa's campus cafés) */
  readonly locations?: readonly EateryLocation[]
  /** Map place this eatery is inside of; used for the link when it has no pin of its own */
  readonly placeId?: string
  readonly url?: string
  /** Shown in the "Dining halls" group */
  readonly diningHall?: boolean
  readonly aliases?: readonly string[]
}

/** Which of an area's eateries a list shows */
export type EateryKind = 'all' | 'dining-halls' | 'others'

export const EATERY_KINDS: Record<EateryKind, string> = {
  all: 'All of them',
  'dining-halls': 'Dining halls only',
  others: 'All but dining halls',
}

export const eateriesIn = (eateries: readonly Eatery[], area: EatArea, kind: EateryKind = 'all') =>
  eateries.filter((e) => e.area === area && (kind === 'all' || (kind === 'dining-halls') === !!e.diningHall))

/** The map pin an eatery's "Show on map" opens: its own, its first location's, or the place it's in */
export const eateryMapId = (e: Eatery) => (e.lat !== undefined ? e.id : (e.locations?.[0]?.id ?? e.placeId))

export const directionsHref = (e: Pick<Eatery, 'address' | 'lat' | 'lng'>) =>
  e.lat !== undefined && e.lng !== undefined
    ? `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.address}, Atlanta, GA`)}`

// ── Hours, as saved ──────────────────────────────────────────────────────────

const TIME = /^([01]\d|2[0-4]):[0-5]\d$/

/** A saved schedule, keeping only well-formed ranges; undefined when there's none at all */
export const parseSchedule = (value: unknown): Schedule | undefined => {
  if (!Array.isArray(value)) return undefined
  return value.flatMap((r): HoursRange[] => {
    if (!r || typeof r !== 'object') return []
    const { days, open, close } = r as Record<string, unknown>
    const d = Array.isArray(days) ? [...new Set(days.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 6))].sort() : []
    if (!d.length || typeof open !== 'string' || typeof close !== 'string' || !TIME.test(open) || !TIME.test(close) || open === close) return []
    return [{ days: d, open, close }]
  })
}

// ── The eateries table ───────────────────────────────────────────────────────

const orUndefined = <T>(v: T | null) => v ?? undefined

/** A row of the eateries table as an eatery */
export const eateryFromRow = (row: EateryRow): Eatery => ({
  id: row.slug,
  name: row.name,
  area: row.area,
  address: row.address,
  description: row.description,
  hours: orUndefined(row.hours),
  schedule: parseSchedule(row.schedule),
  status: orUndefined(row.status),
  note: orUndefined(row.note),
  lat: orUndefined(row.lat),
  lng: orUndefined(row.lng),
  locations: row.locations.length ? row.locations.map((l) => ({ id: l.id, label: l.label, lat: l.lat, lng: l.lng, schedule: parseSchedule(l.schedule) })) : undefined,
  placeId: orUndefined(row.place_id),
  url: orUndefined(row.url),
  diningHall: row.dining_hall,
  aliases: row.aliases,
})

export const areaFromRow = (row: EateryAreaRow): EateryArea => ({ slug: row.slug, title: row.title, description: orUndefined(row.description) })

// ── Closures ─────────────────────────────────────────────────────────────────

/** Today in Atlanta, "YYYY-MM-DD", as closures' dates are */
export const atlantaToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now)

/** "2027-01-10" → "Jan 10" */
export const shortDate = (iso: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))

/**
 * The eateries as they are on `today`: one a closure covers shows "Closed for <label>
 * through <date>" in place of its hours, and its hours (and each location's) read as never
 * open, so the map shows it closed too
 */
export function applyClosures(eateries: readonly Eatery[], closures: readonly Pick<EateryClosureRow, 'label' | 'starts_on' | 'ends_on' | 'eateries'>[], today: string): Eatery[] {
  const active = closures.filter((c) => c.starts_on <= today && today <= c.ends_on)
  if (!active.length) return [...eateries]
  return eateries.map((e) => {
    const closure = active.find((c) => c.eateries.includes(e.id))
    if (!closure) return e
    return {
      ...e,
      status: `Closed for ${closure.label} through ${shortDate(closure.ends_on)}`,
      schedule: e.schedule ? [] : undefined,
      locations: e.locations?.map((l) => ({ ...l, schedule: l.schedule ? [] : undefined })),
    }
  })
}

/** A schedule as the table saves it */
export const scheduleJson = (s: Schedule | undefined) => (s ? s.map((r) => ({ days: [...r.days], open: r.open, close: r.close })) : null)

/** An eatery as a row of the eateries table, `sort` placing it in its area */
export const eateryToRow = (e: Eatery, sort: number): EateryInsert => ({
  slug: e.id,
  name: e.name,
  area: e.area,
  dining_hall: !!e.diningHall,
  address: e.address,
  description: e.description,
  hours: e.hours ?? null,
  schedule: scheduleJson(e.schedule),
  status: e.status ?? null,
  note: e.note ?? null,
  lat: e.lat ?? null,
  lng: e.lng ?? null,
  locations: (e.locations ?? []).map((l) => ({ id: l.id, label: l.label, lat: l.lat, lng: l.lng, schedule: scheduleJson(l.schedule) })),
  place_id: e.placeId ?? null,
  url: e.url ?? null,
  aliases: [...(e.aliases ?? [])],
  sort,
  published: true,
})
