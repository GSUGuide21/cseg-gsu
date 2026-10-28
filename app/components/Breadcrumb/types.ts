import type { ReactNode } from 'react'

export interface BreadcrumbItemData {
  label: ReactNode
  /** Leave out for the current page (the last item) */
  href?: string
}

export interface BreadcrumbProps {
  /** From the top level down to the current page, which comes last */
  items: readonly BreadcrumbItemData[]
  /**
   * Past this many items, the middle ones fold into a "…" button that shows them. The
   * first and the last two always show. Default 4.
   */
  maxItems?: number
  className?: string
}

export interface BreadcrumbItemProps {
  item: BreadcrumbItemData
  /** The page you're on: plain text, marked as current */
  current: boolean
  /** Draws the separator before it (all but the first) */
  separated: boolean
}
