import type { FC } from 'react'

import { cn } from '@/lib/cn'

import type { SkeletonProps } from './types'

/** A soft block with a sheen passing over it; still when motion is reduced */
export const skeleton = cn(
  'block bg-[linear-gradient(90deg,color-mix(in_srgb,var(--fg)_7%,var(--bg))_25%,color-mix(in_srgb,var(--fg)_12%,var(--bg))_50%,color-mix(in_srgb,var(--fg)_7%,var(--bg))_75%)]',
  'bg-size-[200%_100%] animate-shimmer motion-reduce:animate-none'
)

/**
 * A placeholder in the shape of what's loading: lines of text, an image, an avatar.
 *
 *   <Skeleton shape="circle" width={40} />
 *   <Skeleton shape="text" lines={3} />
 *   <Skeleton height={160} className="rounded-xl" />
 *
 * Skeletons are hidden from screen readers; mark the region that's loading with
 * aria-busy="true" (and say "Loading…" somewhere, like Spinner's label) instead.
 */
export const Skeleton: FC<SkeletonProps> = ({ shape = 'rect', lines = 1, width, height, className }) => {
  if (shape === 'text') {
    return (
      <span aria-hidden className={cn('flex w-full flex-col gap-2', className)} style={{ width }}>
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            // Text-height bars, with the last of several cut short
            className={cn(skeleton, 'h-[0.8em] rounded-full')}
            style={{ width: lines > 1 && i === lines - 1 ? '60%' : '100%', height }}
          />
        ))}
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className={cn(skeleton, shape === 'circle' ? 'aspect-square rounded-full' : 'rounded-lg', className)}
      style={{ width: width ?? (shape === 'circle' ? 40 : '100%'), height: height ?? (shape === 'circle' ? undefined : 16) }}
    />
  )
}
