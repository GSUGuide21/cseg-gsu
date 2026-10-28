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

/** "2026-10" for grouping by month, in Atlanta's time zone */
export const monthKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit' }).slice(0, 7)

/** The last `n` months as keys and short labels, oldest first, ending with this one */
export const lastMonths = (n: number, now = new Date()) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 15))
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) }
  })
