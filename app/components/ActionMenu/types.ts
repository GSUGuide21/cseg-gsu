import type { ReactElement, ReactNode } from 'react'

import type { Align, Side } from '../useFloating'

export interface ActionItem {
  label: string
  icon?: ReactNode
  /** A second line under the label */
  description?: string
  /** What it does; the menu closes after */
  onSelect?: () => void
  /** Makes it a link instead */
  href?: string
  /** Shown at the end, as keycaps (see Kbd): ["mod", "D"]. It only labels; wire the shortcut up yourself. */
  shortcut?: string | string[]
  /** For deleting and other actions that can't be undone */
  danger?: boolean
  disabled?: boolean
}

/** A labeled set of items, with a line above it */
export interface ActionGroup {
  label: string
  items: ActionItem[]
}

export type ActionMenuEntry = ActionItem | ActionGroup | 'separator'

export interface ActionMenuProps {
  items: ActionMenuEntry[]
  /**
   * The button that opens it. Leave out for a "⋯" button, named by `label`, which is
   * what a table row's actions usually want.
   */
  trigger?: ReactElement<Record<string, unknown>>
  /** Names the default "⋯" button, and the menu: "Actions for Jordan Lee". Default "More actions". */
  label?: string
  side?: Side
  /** Default "end", so a menu at a row's right edge opens inward */
  align?: Align
  /**
   * Opens the menu at this spot (a right-click, the text cursor) instead of from a button:
   * no trigger is shown, `open` says when, and `onDismiss` puts focus back where it was.
   */
  point?: { x: number; y: number }
  /** Controlled open state (needed with `point`); leave out to let the button manage it */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** With `point`: the menu closed; `returnFocus` is true unless something else took focus */
  onDismiss?: (returnFocus: boolean) => void
  className?: string
}
