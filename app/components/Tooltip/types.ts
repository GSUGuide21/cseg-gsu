import type { ReactElement, ReactNode } from 'react'

import type { Side } from '../useFloating'

export interface TooltipProps {
  /** What the tooltip says; keep it short, and nothing to click (use a Popover for that) */
  content: ReactNode
  /** The one element it's about: a button, a link, an icon with tabIndex */
  children: ReactElement<Record<string, unknown>>
  /**
   * "description" (default): extra detail, read after the element's own name.
   * "label": the element's name, for icon-only buttons with no text of their own.
   */
  role?: 'description' | 'label'
  /** Preferred side; it flips when there's no room. Default "top". */
  side?: Side
  /** Wait before showing on hover, in ms. Keyboard focus shows it at once. Default 400. */
  delay?: number
  className?: string
}
