import type { ReactNode } from 'react'

export interface DialogProps {
  open: boolean
  /** Called for every way of closing it: the close button, Escape, or a click on the dimmed page */
  onClose: () => void
  /** Heading at the top, which also names it */
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  /** Actions along the bottom, at the right: Cancel, then the main action last */
  footer?: ReactNode
  /** sm 24rem, md 32rem, lg 44rem wide. Default "md". */
  size?: 'sm' | 'md' | 'lg'
  /** Closing by clicking the dimmed page; turn off when it holds unsaved work. Default true. */
  closeOnBackdrop?: boolean
  className?: string
}
