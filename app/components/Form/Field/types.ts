import type { ReactNode } from 'react'

import type { Orientation } from '../types'
import type { LabelType } from './Label/types'

interface FieldText {
  /** Help text under the control, read out with it */
  description?: ReactNode
  /** Shown in place of nothing when set; marks the control invalid */
  error?: ReactNode
  required?: boolean
  disabled?: boolean
  className?: string
  children: ReactNode
}

export interface FieldProps extends FieldText {
  label: ReactNode
  labelType?: LabelType
  /** Id for the control; generated when left out */
  id?: string
}

export interface FieldsetProps extends FieldText {
  legend: ReactNode
  orientation?: Orientation
}

/** What a Field hands to the control inside it */
export interface FieldContextValue {
  id: string
  labelId: string
  descriptionId?: string
  errorId?: string
  invalid: boolean
  required: boolean
  disabled: boolean
  labelType: LabelType
}

/** A control's own overrides; anything left out comes from its Field */
export interface FieldControlOptions {
  id?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  'aria-describedby'?: string
}
