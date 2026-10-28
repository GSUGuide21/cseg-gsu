import type { ReactNode } from 'react'

export interface DividerProps {
  /** Text in the middle of the line: "or", "Earlier" */
  label?: ReactNode
  /** "vertical" for between items in a row (it stretches to the row's height). Default "horizontal". */
  orientation?: 'horizontal' | 'vertical'
  className?: string
}
