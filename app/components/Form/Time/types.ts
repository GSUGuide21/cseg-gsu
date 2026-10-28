import type { ControlSize } from '../types'
import type { ISOTime } from './utils'

/**
 * "picker": a text box plus a panel of hour, minute (every `step`), and AM/PM columns.
 * "segments": hour, minute, and AM/PM boxes stepped one minute at a time, for any exact time.
 */
export type TimeInputType = 'picker' | 'segments'

export interface TimeInputProps {
  /** Default "picker" */
  type?: TimeInputType
  /** "HH:mm", 24-hour; `null` is "controlled, empty", and leaving it out is uncontrolled */
  value?: ISOTime | null
  defaultValue?: ISOTime | null
  onValueChange?: (value: ISOTime | null) => void
  /** Earliest and latest allowed times, "HH:mm" */
  min?: ISOTime
  max?: ISOTime
  /**
   * "picker": minutes between the choices in the minutes column (default 5; typing allows any
   * minute). "segments": how far Shift+arrow and Page Up/Down jump the minutes (default 15);
   * plain arrows always move one minute.
   */
  step?: number
  /** How times read: "9:30 AM" in en-US, "09:30" in en-GB (which also drops the AM/PM column). Default "en-US". */
  locale?: string
  /** Sent with the form as "HH:mm" */
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
