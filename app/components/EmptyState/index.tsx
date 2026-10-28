import type { FC } from 'react'

import { cn } from '@/lib/cn'

import type { EmptyStateProps } from './types'

/**
 * What to show where something has nothing yet: no events, no results, no members match.
 * Say what's missing and offer the way forward.
 *
 *   <EmptyState icon={<CalendarPlus />} title="No events yet" description="Events you create show up here."
 *     actions={<Button>Create an event</Button>} />
 */
export const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, actions, size = 'md', bordered = false, headingLevel, className }) => {
  const Title = headingLevel ? (`h${headingLevel}` as const) : 'p'
  const sm = size === 'sm'
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        sm ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12',
        bordered && 'rounded-2xl border border-dashed border-line',
        className
      )}
    >
      {icon ? (
        <span aria-hidden className={cn('grid place-items-center rounded-full bg-brand-tint text-brand', sm ? 'size-10 [&>svg]:size-5' : 'size-14 [&>svg]:size-6')}>
          {icon}
        </span>
      ) : null}
      <Title className={cn('m-0 font-bold text-ink', sm ? 'text-[0.95rem]' : 'text-[1.1rem]')}>{title}</Title>
      {description ? <p className={cn('m-0 max-w-sm text-pretty text-muted', sm ? 'text-[0.85rem]' : 'text-[0.92rem]')}>{description}</p> : null}
      {actions ? <div className="mt-1 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  )
}
