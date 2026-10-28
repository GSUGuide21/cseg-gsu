import type { ControlSize } from '../types'
import type { CalendarProps } from './Calendar/types'
import type { DateRange, ISODate } from './utils'

export interface DateRangePickerProps extends Pick<CalendarProps, 'min' | 'max' | 'isDateDisabled' | 'weekStartsOn' | 'locale'> {
  /** Both days, "YYYY-MM-DD"; reported only when whole. `null` is "controlled, empty". */
  value?: { start: ISODate; end: ISODate } | null
  defaultValue?: { start: ISODate; end: ISODate } | null
  onValueChange?: (value: { start: ISODate; end: ISODate } | null) => void
  /** Quick picks beside the calendar (Today, Next 7 days, This month…). Default true. */
  presets?: boolean
  /** Sent with the form under this name twice, start first */
  name?: string
  size?: ControlSize
  id?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  className?: string
  'aria-describedby'?: string
}

export type { DateRange }

export interface DatePickerProps extends Pick<CalendarProps, 'min' | 'max' | 'isDateDisabled' | 'weekStartsOn' | 'locale'> {
  /** "YYYY-MM-DD"; `null` is "controlled, empty", and leaving it out is uncontrolled */
  value?: ISODate | null
  defaultValue?: ISODate | null
  onValueChange?: (value: ISODate | null) => void
  /** Sent with the form as "YYYY-MM-DD" */
  name?: string
  placeholder?: string
  size?: ControlSize
  id?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}
