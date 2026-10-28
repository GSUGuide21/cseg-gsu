import type { ReactNode } from 'react'

export interface Command {
  id: string
  label: string
  /** Commands are listed under their group's heading, in the order groups first appear */
  group?: string
  icon?: ReactNode
  /** A second line, or text at the end of the row */
  description?: string
  /** Shown as keycaps (see Kbd); it only labels, so wire the shortcut up yourself */
  shortcut?: string | string[]
  /** Other words that find it: ["people", "roster"] for "Members" */
  keywords?: string[]
  /** Go somewhere */
  href?: string
  /** Or do something; the palette closes first */
  onSelect?: () => void
  disabled?: boolean
}

export interface CommandPaletteProps {
  commands: Command[]
  /** Controlled open state; leave out to let it manage itself */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** The shortcut that opens it, from anywhere on the page. Default ["mod", "K"] (⌘K or Ctrl+K); false for none. */
  hotkey?: string[] | false
  /** Default "Search or jump to…" */
  placeholder?: string
  /** Shows a search-style button that opens it, with the shortcut on it. Default true. */
  trigger?: boolean
  /** Shown when nothing matches. Default "No results". */
  emptyText?: ReactNode
  /** Classes for the trigger button */
  className?: string
}
