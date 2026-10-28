import type { DateRange, ISODate } from '../utils'

interface BaseCalendarProps {
  /** Earliest and latest days that can be picked */
  min?: ISODate
  max?: ISODate
  /** Days to rule out, e.g. weekends: (iso) => [0, 6].includes(new Date(iso + 'T00:00').getDay()) */
  isDateDisabled?: (iso: ISODate) => boolean
  /** 0 = Sunday (default), 1 = Monday */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** For month and weekday names. Default "en-US". */
  locale?: string
  /** Months shown side by side (they stack when there's no room). Default 1. */
  months?: 1 | 2
  /** Moves focus to the picked (or today's) day on mount, as a popup calendar should */
  autoFocus?: boolean
  className?: string
}

export interface SingleCalendarProps extends BaseCalendarProps {
  mode?: 'single'
  /** The picked day */
  value?: ISODate | null
  onValueChange?: (value: ISODate) => void
}

export interface RangeCalendarProps extends BaseCalendarProps {
  mode: 'range'
  /** The picked span; the first click sets `start`, the second `end` */
  range?: DateRange | null
  onRangeChange?: (range: DateRange) => void
}

export type CalendarProps = SingleCalendarProps | RangeCalendarProps

/** Which part of the calendar is showing: days of a month, the months of a year, or a span of years */
export type CalendarView = 'days' | 'months' | 'years'
