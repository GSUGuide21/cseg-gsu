import type { FC } from 'react'

import { cn } from '@/lib/cn'

import type { DescriptionListProps } from './types'

/**
 * Labels and their values: a member's profile, an event's settings, a receipt.
 *
 *   <DescriptionList items={[
 *     { term: 'Email', details: 'jordan.lee@student.gsu.edu' },
 *     { term: 'Joined', details: 'Jan 1, 2026' },
 *   ]} />
 *
 * A <dl>, so each value is read with its label.
 */
export const DescriptionList: FC<DescriptionListProps> = ({ items, layout = 'columns', divided = true, className }) => {
  const columns = layout === 'columns'
  return (
    <div className={cn('@container', className)}>
      <dl className={cn('m-0 flex flex-col', divided && 'divide-y divide-line')}>
        {items.map((item, i) => (
          <div key={i} className={cn('flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0', columns && '@lg:grid @lg:grid-cols-[minmax(8rem,1fr)_2fr] @lg:gap-4')}>
            <dt className="text-[0.85rem] font-semibold text-muted">{item.term}</dt>
            <dd className="m-0 min-w-0 text-[0.92rem] break-words text-ink">{item.details}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
