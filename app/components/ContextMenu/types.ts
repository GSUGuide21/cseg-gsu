import type { ReactNode } from 'react'

import type { ActionMenuEntry } from '../ActionMenu/types'

export interface ContextMenuProps {
  /**
   * What's in the menu. A function is asked each time it opens, so the items can depend on
   * what was clicked (a table's rows and columns only inside a table).
   */
  items: ActionMenuEntry[] | ((target: EventTarget | null) => ActionMenuEntry[])
  /** The area that gets the menu: right-click (or press the Menu key) anywhere in it */
  children: ReactNode
  /** Names the menu. Default "Context menu". */
  label?: string
  /** Where focus goes back to after the menu closes; default, what had it before */
  onClose?: (returnFocus: boolean) => void
  /** Turns it off, leaving the browser's own menu */
  disabled?: boolean
  className?: string
}
