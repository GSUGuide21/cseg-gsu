/**
 * Which academic term a day falls in, worked out from Georgia State's usual calendar rather
 * than typed in. GSU's dates move a little each year, so these are estimates, close enough to
 * say which term it is and to fill in a new term's dates for officers to check:
 *
 *   Spring: classes from the Monday on or after January 8, through the Friday on or after May 2 (finals)
 *   Summer: the Monday on or after May 14, through the Friday on or before August 7
 *   Fall:   the Monday on or after August 19, through the Friday on or after December 9 (finals)
 *
 * A break counts toward the term just finished (winter break is still the fall), as the
 * dashboard's saved terms do. Days are "YYYY-MM-DD", on Atlanta's calendar.
 */

export type Season = 'Spring' | 'Summer' | 'Fall'

export interface AcademicTerm {
  season: Season
  year: number
  /** "Fall 2026" */
  name: string
  /** The first day of classes */
  starts_on: string
  /** The last day of finals */
  ends_on: string
}

const SEASONS: readonly Season[] = ['Spring', 'Summer', 'Fall']

const iso = (d: Date) => d.toISOString().slice(0, 10)
const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day))

/** The first `weekday` (0 Sunday … 6 Saturday) on or after a day, or on or before it */
const weekdayFrom = (from: Date, weekday: number, direction: 1 | -1) => {
  const d = new Date(from)
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + direction)
  return d
}
const MONDAY = 1
const FRIDAY = 5

/** A term's estimated first and last days */
export const termDates = (season: Season, year: number): AcademicTerm => {
  const [start, end] =
    season === 'Spring'
      ? [weekdayFrom(utc(year, 1, 8), MONDAY, 1), weekdayFrom(utc(year, 5, 2), FRIDAY, 1)]
      : season === 'Summer'
        ? [weekdayFrom(utc(year, 5, 14), MONDAY, 1), weekdayFrom(utc(year, 8, 7), FRIDAY, -1)]
        : [weekdayFrom(utc(year, 8, 19), MONDAY, 1), weekdayFrom(utc(year, 12, 9), FRIDAY, 1)]
  return { season, year, name: `${season} ${year}`, starts_on: iso(start), ends_on: iso(end) }
}

/** The term after this one: spring, summer, fall, then the next spring */
export const nextTerm = (t: Pick<AcademicTerm, 'season' | 'year'>): AcademicTerm => {
  const at = SEASONS.indexOf(t.season)
  return at === SEASONS.length - 1 ? termDates('Spring', t.year + 1) : termDates(SEASONS[at + 1], t.year)
}

/**
 * The term a day falls in: the one in session, or between terms the one just finished.
 * `inSession` says which, and `next` is the term after it (the one a break leads into).
 *
 *   academicTermOn('2026-11-17') → Fall 2026, in session
 *   academicTermOn('2026-12-28') → Fall 2026, on break; next is Spring 2027
 */
export const academicTermOn = (day: string): { term: AcademicTerm; inSession: boolean; next: AcademicTerm } => {
  const year = Number(day.slice(0, 4))
  // Last fall (for early January), then this year's three: the latest that's started is the one
  const started = [termDates('Fall', year - 1), ...SEASONS.map((s) => termDates(s, year))].filter((t) => t.starts_on <= day)
  const term = started[started.length - 1]
  return { term, inSession: day <= term.ends_on, next: nextTerm(term) }
}
