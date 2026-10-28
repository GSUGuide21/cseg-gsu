/**
 * Dates as "YYYY-MM-DD" strings: what <input type="date"> and most APIs use, and free of
 * time zones (a Date at local midnight turns into the day before when read as UTC).
 * Arithmetic goes through local Dates, which roll months and years over correctly.
 */

export type ISODate = string

const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** The Date for "YYYY-MM-DD", or null when it's not a real day (2026-02-30) */
export const fromISODate = (iso: string | null | undefined): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null
}

export const today = () => toISODate(new Date())

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

/** Same day in another month, or that month's last day (Jan 31 + 1 month = Feb 28) */
export const addMonths = (d: Date, n: number) => {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1)
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), daysInMonth(first.getFullYear(), first.getMonth())))
}

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

export const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

/** Strings compare in date order, so min/max checks need no parsing */
export const inRange = (iso: ISODate, min?: ISODate, max?: ISODate) => (!min || iso >= min) && (!max || iso <= max)

export const startOfWeek = (d: Date, weekStartsOn: number) => addDays(d, -((d.getDay() - weekStartsOn + 7) % 7))

/** Months between two dates' months: Oct → Dec is 2 */
export const monthsBetween = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth()

/** A span of days; `end` is null while the second day is still being picked */
export interface DateRange {
  start: ISODate | null
  end: ISODate | null
}

/** Days in a range, counting both ends: Oct 27 – Oct 29 is 3 */
export const rangeLength = (start: ISODate, end: ISODate) =>
  Math.round((fromISODate(end)!.getTime() - fromISODate(start)!.getTime()) / 86_400_000) + 1

/** "Oct 27 – Nov 3, 2026", with the shared month or year said once */
export const formatRange = (start: ISODate, end: ISODate, locale: string) => {
  const f = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' })
  return start === end ? f.format(fromISODate(start)!) : f.formatRange(fromISODate(start)!, fromISODate(end)!)
}

/** Quick picks for a range picker, worked out from today */
export const RANGE_PRESETS: readonly { label: string; get: (today: Date, weekStartsOn: number) => [Date, Date] }[] = [
  { label: 'Today', get: (t) => [t, t] },
  { label: 'Tomorrow', get: (t) => [addDays(t, 1), addDays(t, 1)] },
  { label: 'This week', get: (t, w) => [startOfWeek(t, w), addDays(startOfWeek(t, w), 6)] },
  { label: 'Next 7 days', get: (t) => [t, addDays(t, 6)] },
  { label: 'Next week', get: (t, w) => [addDays(startOfWeek(t, w), 7), addDays(startOfWeek(t, w), 13)] },
  { label: 'This month', get: (t) => [startOfMonth(t), new Date(t.getFullYear(), t.getMonth() + 1, 0)] },
  { label: 'Next 30 days', get: (t) => [t, addDays(t, 29)] },
]

/** Whether the locale writes day before month ("27/10/2026") */
const dayFirst = (locale: string) => {
  const parts = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(new Date(2026, 9, 27))
  return parts.findIndex((p) => p.type === 'day') < parts.findIndex((p) => p.type === 'month')
}

/** How a date shows in a text box: "10/27/2026" in en-US. Numeric, so it's easy to edit. */
export const formatDate = (iso: ISODate, locale: string) => {
  const d = fromISODate(iso)
  return d ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d) : ''
}

/** The shape formatDate writes, as a hint: "MM/DD/YYYY" in en-US, "DD/MM/YYYY" in en-GB */
export const datePattern = (locale: string) =>
  new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(2026, 9, 27))
    .map((p) => (p.type === 'year' ? 'YYYY' : p.type === 'month' ? 'MM' : p.type === 'day' ? 'DD' : p.value))
    .join('')

/** A day spelled out, for screen readers and titles: "Tuesday, October 27, 2026" */
export const formatLongDate = (d: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(d)

/**
 * Reads what someone typed: "2026-10-27", "10/27/2026", "10-27-26", or (day-first
 * locales) "27/10/2026", plus written-out dates the browser understands ("Oct 27 2026").
 * Two-digit years are 20xx. Returns null when it isn't a real date.
 */
export const parseDate = (text: string, locale: string): ISODate | null => {
  const t = text.trim()
  if (!t) return null
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) {
    const [y, m, d] = t.split('-').map(Number)
    return fromISODate(`${y}-${pad(m)}-${pad(d)}`) ? `${y}-${pad(m)}-${pad(d)}` : null
  }
  const numeric = /^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{2}|\d{4})$/.exec(t)
  if (numeric) {
    const [a, b] = [Number(numeric[1]), Number(numeric[2])]
    const [month, day] = dayFirst(locale) ? [b, a] : [a, b]
    const year = numeric[3].length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3])
    const iso = `${year}-${pad(month)}-${pad(day)}`
    return fromISODate(iso) ? iso : null
  }
  if (/[a-z]/i.test(t)) {
    const ms = Date.parse(t)
    return Number.isNaN(ms) ? null : toISODate(new Date(ms))
  }
  return null
}
