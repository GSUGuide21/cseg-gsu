import type { ComponentProps, ReactNode } from 'react'

export interface SwitchProps extends Omit<ComponentProps<'input'>, 'type' | 'children' | 'size'> {
  /** The label: what turns on ("Email me about new events") */
  children?: ReactNode
  /** Second line under the label */
  description?: ReactNode
  onCheckedChange?: (checked: boolean) => void
  size?: 'sm' | 'md'
  /** "end" (default) puts the switch after the label, settings-style, across the row; "start" before it */
  switchPosition?: 'start' | 'end'
  invalid?: boolean
}
