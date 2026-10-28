import type { ComponentProps } from 'react'

import type { ControlSize } from '../types'

export interface NumberInputProps
  extends Omit<ComponentProps<'input'>, 'size' | 'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step'> {
  /** `null` is "controlled, empty"; leave out for uncontrolled */
  value?: number | null
  defaultValue?: number | null
  onValueChange?: (value: number | null) => void
  min?: number
  max?: number
  /** Amount the buttons and arrow keys change the value by. Default 1. */
  step?: number
  size?: ControlSize
  /** Shows the − and + buttons. Default true. */
  stepper?: boolean
  invalid?: boolean
  /** Classes for the inner <input>; `className` styles the box around it */
  inputClassName?: string
}

export interface NumberContextValue {
  value: number | null
  increment: () => void
  decrement: () => void
  canIncrement: boolean
  canDecrement: boolean
  disabled: boolean
}
