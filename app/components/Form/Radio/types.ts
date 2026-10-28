import type { ComponentProps, ReactNode } from 'react'

import type { ChoiceVariant } from '../Checkbox/types'
import type { FieldsetProps } from '../Field/types'

export interface RadioProps extends Omit<ComponentProps<'input'>, 'type' | 'children' | 'value'> {
  value: string
  /** The label */
  children?: ReactNode
  /** Second line under the label */
  description?: ReactNode
}

export interface RadioGroupProps extends Omit<FieldsetProps, 'children'> {
  /** Shared `name`; generated when left out, which is fine unless the form is submitted natively */
  name?: string
  /** `null` is "controlled, nothing picked"; leave out for uncontrolled */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string) => void
  variant?: ChoiceVariant
  children: ReactNode
}

export interface RadioGroupContextValue {
  name: string
  value: string | null
  select: (value: string) => void
  required: boolean
  invalid: boolean
  variant: ChoiceVariant
}
