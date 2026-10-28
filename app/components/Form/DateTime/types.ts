import type { DatePickerProps } from '../Date/types'
import type { TimeInputProps } from '../Time/types'
import type { ControlSize } from '../types'

export interface DateTimePickerProps
  extends Pick<DatePickerProps, 'min' | 'max' | 'isDateDisabled' | 'weekStartsOn'>,
    Pick<TimeInputProps, 'step'> {
  /** Local date and time, "YYYY-MM-DDTHH:mm" (what <input type="datetime-local"> sends) */
  value?: string | null
  defaultValue?: string | null
  /** Called with the full value once both halves are filled, and null while either is empty */
  onValueChange?: (value: string | null) => void
  /** How the time half works: a column picker (default) or hour/minute boxes for any exact minute */
  timeType?: TimeInputProps['type']
  /** Earliest and latest times of day, "HH:mm" */
  minTime?: string
  maxTime?: string
  locale?: string
  /** Sent with the form as "YYYY-MM-DDTHH:mm" */
  name?: string
  size?: ControlSize
  id?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  className?: string
  'aria-describedby'?: string
}
