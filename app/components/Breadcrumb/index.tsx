'use client'

import { useState, type FC, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { BreadcrumbItem, BreadcrumbLi } from './Item'
import type { BreadcrumbProps } from './types'

/**
 * Where this page sits in the site: links back up to each level above, ending with the
 * current page.
 *
 *   <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Resources', href: '/resources' }, { label: 'Tutoring' }]} />
 *
 * A long trail folds its middle into "…", which shows the rest when pressed.
 */
export const Breadcrumb: FC<BreadcrumbProps> = ({ items, maxItems = 4, className }) => {
  const [expanded, setExpanded] = useState(false)
  const fold = !expanded && items.length > maxItems
  // First item, then the last two
  const shown = fold ? [items[0], ...items.slice(-2)] : items
  const hidden = items.length - shown.length

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={cn('m-0 flex list-none flex-wrap items-center gap-x-1.5 gap-y-1 p-0 text-[0.85rem]')}>
        {shown.map((item, i) => {
          const index = fold && i > 0 ? i + hidden : i
          return (
            <FoldAware key={index} fold={fold && i === 1} hidden={hidden} onExpand={() => setExpanded(true)}>
              <BreadcrumbItem item={item} current={index === items.length - 1} separated={index > 0} />
            </FoldAware>
          )
        })}
      </ol>
    </nav>
  )
}

/** Puts the "…" button in before the item it folds up to */
const FoldAware: FC<{ fold: boolean; hidden: number; onExpand: () => void; children: ReactNode }> = ({ fold, hidden, onExpand, children }) => (
  <>
    {fold ? (
      <BreadcrumbLi separated>
        <button
          type="button"
          onClick={onExpand}
          aria-label={`Show ${hidden} more ${hidden === 1 ? 'level' : 'levels'}`}
          className="cursor-pointer rounded px-1 font-semibold text-muted transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
        >
          …
        </button>
      </BreadcrumbLi>
    ) : null}
    {children}
  </>
)
