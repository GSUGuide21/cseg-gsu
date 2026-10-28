import type { ComponentProps, ReactNode } from 'react'

import type { ControlSize } from '../types'

export interface InputProps extends Omit<ComponentProps<'input'>, 'size'> {
  size?: ControlSize
  /** Icon or text before the value, like a search icon or "$" */
  leading?: ReactNode
  /** Icon, text, or a small button after the value, like "@student.gsu.edu" */
  trailing?: ReactNode
  /** Marks the control invalid outside a Field (a Field with `error` does this for you) */
  invalid?: boolean
  /** Classes for the inner <input>; `className` styles the box around it */
  inputClassName?: string
}
