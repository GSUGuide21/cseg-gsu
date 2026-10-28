import type { ComponentProps, ReactNode } from 'react'

import type { FieldsetProps } from '../Field/types'

/** "default" is a box and label; "card" puts each choice in a bordered tile */
export type ChoiceVariant = 'default' | 'card'

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type' | 'children'> {
  /** The label */
  children?: ReactNode
  /** Second line under the label */
  description?: ReactNode
  /** Shows a dash: some, but not all, of what this box controls is checked */
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
  invalid?: boolean
  variant?: ChoiceVariant
}

export interface CheckboxGroupProps extends Omit<FieldsetProps, 'children'> {
  /** Shared `name`, so each checked value is sent with the form */
  name?: string
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  variant?: ChoiceVariant
  children: ReactNode
}

export interface CheckboxGroupContextValue {
  name?: string
  value: string[]
  toggle: (value: string, checked: boolean) => void
  variant: ChoiceVariant
}
