import type { ComponentProps } from 'react'

export interface TextAreaProps extends ComponentProps<'textarea'> {
  /** Grows with its text (where the browser supports it) instead of scrolling. Default true. */
  autoResize?: boolean
  /** Shows "used / max" under the box. Default: on whenever `maxLength` is set. */
  showCount?: boolean
  invalid?: boolean
  /** Classes for the inner <textarea>; `className` styles the box around it */
  textAreaClassName?: string
}
