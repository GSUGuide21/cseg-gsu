import type { FC } from 'react'

import { cn } from '@/lib/cn'

import type { DividerProps } from './types'

/**
 * A thin line between sections or items.
 *
 *   <Divider />
 *   <Divider label="or" />
 *   <div className="flex items-center gap-3">Edit <Divider orientation="vertical" /> Share</div>
 */
export const Divider: FC<DividerProps> = ({ label, orientation = 'horizontal', className }) => {
  if (orientation === 'vertical') {
    return <span role="separator" aria-orientation="vertical" className={cn('w-px shrink-0 self-stretch bg-line', className)} />
  }
  if (!label) return <hr className={cn('m-0 h-px w-full border-0 bg-line', className)} />
  return (
    <div role="separator" className={cn('flex w-full items-center gap-3 text-[0.8rem] font-semibold text-muted', className)}>
      <span aria-hidden className="h-px flex-1 bg-line" />
      {label}
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  )
}
