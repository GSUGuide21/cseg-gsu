import type { ReactNode } from 'react'

import type { ControlSize } from '../types'

export interface SegmentedOption {
  value: string
  label: ReactNode
  icon?: ReactNode
  /** Names it when `label` is only an icon */
  'aria-label'?: string
  disabled?: boolean
}

export interface SegmentedControlProps {
  options: SegmentedOption[]
  /** `null` is "controlled, nothing picked"; leave out for uncontrolled (the first option is picked) */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string) => void
  /** Sent with the form */
  name?: string
  size?: ControlSize
  /** Segments share the full width */
  fitted?: boolean
  disabled?: boolean
  /** Names the group when it isn't in a Field */
  'aria-label'?: string
  className?: string
}
