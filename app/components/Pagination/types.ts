export interface PaginationProps {
  /** The page showing, from 1 */
  page: number
  pageCount: number
  /**
   * Links to each page (crawlable, and they work without JavaScript): (p) => `/events?page=${p}`.
   * Leave out to use buttons with `onPageChange` instead.
   */
  getHref?: (page: number) => string
  onPageChange?: (page: number) => void
  /** Pages shown either side of the current one. Default 1. */
  siblings?: number
  /** Pages always shown at each end. Default 1. */
  boundaries?: number
  /** Names the navigation, when a page has more than one. Default "Pagination". */
  'aria-label'?: string
  className?: string
}

/** A page number, or a gap where pages are skipped */
export type PageItem = number | 'gap-start' | 'gap-end'
