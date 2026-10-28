import type { ReactElement, ReactNode } from 'react'

import type { Align, Side } from '../useFloating'

export interface PopoverProps {
  /** The button that opens it */
  trigger: ReactElement<Record<string, unknown>>
  /** What's inside: text, links, a small form */
  children: ReactNode
  /** A heading at the top, which also names it for screen readers */
  title?: ReactNode
  /** Its name, when there's no `title` */
  'aria-label'?: string
  /** Controlled open state; leave out to let it manage itself */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Preferred side; it flips when there's no room. Default "bottom". */
  side?: Side
  /** How it lines up with the trigger along that side. Default "start". */
  align?: Align
  className?: string
}
