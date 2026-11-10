/**
 * Dates for dashboard screens, always in Atlanta's time zone: the club is there, and a
 * fixed zone means the server and the browser print the same thing.
 */
const ZONE = 'America/New_York'

/** "Oct 27, 2026", or "Oct 27, 2026, 2:30 PM" with the time */
export const formatDate = (iso: string | null | undefined, withTime = false) => {
  if (!iso) return '—'
  // A bare date (2026-10-27) is that day, not midnight UTC
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)
  return date.toLocaleString('en-US', {
    timeZone: iso.length === 10 ? 'UTC' : ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}

/** How far Atlanta's clock is from UTC at a moment, in ms (−4 or −5 hours) */
const atlantaOffset = (ms: number) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, Number(x.value)])
  )
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000
}

/**
 * A time on Atlanta's clock ("2026-04-23T14:00", as a date-and-time field sends it) as an ISO
 * moment, whatever clock the browser or server keeps; null if it isn't one
 */
export const atlantaToIso = (local: string | null | undefined) => {
  const m = local?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!m) return null
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
  // The offset at the wall time, then again at the moment it gives (they differ only across a clock change)
  const first = wall - atlantaOffset(wall)
  return new Date(wall - atlantaOffset(first)).toISOString()
}

/** An ISO moment on Atlanta's clock, "2026-04-23T14:00", for a date-and-time field */
export const isoToAtlanta = (iso: string | null | undefined) => {
  if (!iso || Number.isNaN(Date.parse(iso))) return null
  const ms = Date.parse(iso)
  return new Date(ms + atlantaOffset(ms)).toISOString().slice(0, 16)
}

/** "Sunday, November 1" */
export const formatToday = (now = new Date()) => now.toLocaleDateString('en-US', { timeZone: ZONE, weekday: 'long', month: 'long', day: 'numeric' })

/** "morning", "afternoon", or "evening" */
export const partOfDay = (now = new Date()) => {
  const hour = Number(now.toLocaleString('en-US', { timeZone: ZONE, hour: 'numeric', hourCycle: 'h23' }))
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
}

const days = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })
const calendarDay = (date: Date) => Date.parse(date.toLocaleDateString('en-CA', { timeZone: ZONE }))

/** How many calendar days off a moment is: "today", "tomorrow", "in 5 days" */
export const daysAway = (iso: string, now = new Date()) => days.format(Math.round((calendarDay(new Date(iso)) - calendarDay(now)) / 86_400_000), 'day')

/** A moment's month and day, for a calendar tile: { month: 'Oct', day: '27' } */
export const dateParts = (iso: string) => {
  const date = new Date(iso)
  return {
    month: date.toLocaleDateString('en-US', { timeZone: ZONE, month: 'short' }),
    day: date.toLocaleDateString('en-US', { timeZone: ZONE, day: 'numeric' }),
  }
}

/** "2026-10" for grouping by month, in Atlanta's time zone */
export const monthKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit' }).slice(0, 7)

/** The last `n` months as keys and short labels, oldest first, ending with this one */
export const lastMonths = (n: number, now = new Date()) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 15))
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) }
  })
