import type { FC } from 'react'

import { cn } from '@/lib/cn'

import type { SpinnerProps, SpinnerSize } from './types'

const SIZES: Record<SpinnerSize, number> = { sm: 16, md: 24, lg: 36 }

/**
 * A spinning ring that says something is loading. It takes the color of the text around
 * it. With reduced motion it turns slowly instead of stopping, so it still reads as busy.
 */
export const Spinner: FC<SpinnerProps> = ({ size = 'md', label = 'Loading', decorative = false, className }) => {
  const px = typeof size === 'number' ? size : SIZES[size]
  return (
    <span role={decorative ? undefined : 'status'} aria-hidden={decorative || undefined} className={cn('inline-flex shrink-0', className)}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="animate-spin motion-reduce:animate-[spin_2.5s_linear_infinite]"
      >
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="3" opacity="0.2" />
        <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {decorative ? null : <span className="sr-only">{label}</span>}
    </span>
  )
}
