import type { ReactNode } from 'react'

export type OffcanvasSide = 'left' | 'right' | 'top' | 'bottom'

export interface OffcanvasProps {
  open: boolean
  /** Called for every way of closing it: the close button, Escape, or a click on the dimmed page */
  onClose: () => void
  /** The edge it slides in from. Default "right". */
  side?: OffcanvasSide
  /** Heading at the top, which also names it */
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  /** Actions pinned to the bottom (Apply, Cancel) */
  footer?: ReactNode
  /** Width (left/right) or height (top/bottom). Default "md". */
  size?: 'sm' | 'md' | 'lg'
  /** Closing by clicking the dimmed page; turn off when it holds unsaved work. Default true. */
  closeOnBackdrop?: boolean
  className?: string
}
