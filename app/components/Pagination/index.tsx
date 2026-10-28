import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/cn'

import type { PageItem, PaginationProps } from './types'

/**
 * The pages to show: both ends, the current page with `siblings` either side, and gaps
 * between. A gap is only used when it hides at least two pages (otherwise the page goes in):
 * 1 … 4 5 6 … 10, but 1 2 3 4 5 … 10 near the start.
 */
export function pageRange(page: number, pageCount: number, siblings = 1, boundaries = 1): PageItem[] {
  const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i)
  // Everything fits: ends, siblings, current, and the two gap slots
  if (pageCount <= boundaries * 2 + siblings * 2 + 3) return range(1, pageCount)
  const start = Math.max(Math.min(page - siblings, pageCount - boundaries - siblings * 2 - 1), boundaries + 2)
  const end = Math.min(Math.max(page + siblings, boundaries + siblings * 2 + 2), pageCount - boundaries - 1)
  return [
    ...range(1, boundaries),
    start > boundaries + 2 ? ('gap-start' as const) : boundaries + 1,
    ...range(start, end),
    end < pageCount - boundaries - 1 ? ('gap-end' as const) : pageCount - boundaries,
    ...range(pageCount - boundaries + 1, pageCount),
  ]
}

const cell = 'grid h-10 min-w-10 place-items-center rounded-lg px-2 text-[0.9rem] font-semibold tabular-nums transition-colors'
const interactive = 'cursor-pointer text-ink-soft hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand'

/**
 * Moves through pages of results: previous, the page numbers (with gaps), next. Narrow
 * screens show "Page 3 of 10" between the arrows instead of the numbers.
 *
 *   <Pagination page={3} pageCount={10} getHref={(p) => `/events?page=${p}`} />
 */
export const Pagination: FC<PaginationProps> = ({
  page,
  pageCount,
  getHref,
  onPageChange,
  siblings = 1,
  boundaries = 1,
  'aria-label': ariaLabel = 'Pagination',
  className,
}) => {
  if (pageCount <= 1) return null
  const current = Math.min(Math.max(1, page), pageCount)

  /** A link or a button to page `p` */
  const to = (p: number, children: ReactNode, props: { 'aria-label'?: string; 'aria-current'?: 'page'; className?: string } = {}) =>
    getHref ? (
      <Link href={getHref(p)} {...props} className={cn(cell, interactive, props.className)}>
        {children}
      </Link>
    ) : (
      <button type="button" onClick={() => onPageChange?.(p)} {...props} className={cn(cell, interactive, props.className)}>
        {children}
      </button>
    )

  const arrow = (p: number, label: string, icon: ReactNode, disabled: boolean) =>
    disabled ? (
      // At the ends the arrow stays in place, greyed, so the layout doesn't shift
      <span aria-hidden className={cn(cell, 'text-ink-faint/50')}>
        {icon}
      </span>
    ) : (
      to(p, icon, { 'aria-label': label })
    )

  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
        <li>{arrow(current - 1, 'Previous page', <ChevronLeft size={18} aria-hidden />, current === 1)}</li>
        {pageRange(current, pageCount, siblings, boundaries).map((item) =>
          typeof item === 'number' ? (
            <li key={item} className="max-sm:hidden">
              {item === current ? (
                <span aria-current="page" className={cn(cell, 'bg-brand-solid text-white')}>
                  <span className="sr-only">Page </span>
                  {item}
                </span>
              ) : (
                to(item, item, { 'aria-label': `Page ${item}` })
              )}
            </li>
          ) : (
            <li key={item} aria-hidden className={cn(cell, 'text-ink-faint max-sm:hidden')}>
              …
            </li>
          )
        )}
        {/* Small screens: a count instead of the numbers */}
        <li className="px-2 text-[0.85rem] font-semibold text-ink-soft sm:hidden">
          Page {current} of {pageCount}
        </li>
        <li>{arrow(current + 1, 'Next page', <ChevronRight size={18} aria-hidden />, current === pageCount)}</li>
      </ul>
    </nav>
  )
}
