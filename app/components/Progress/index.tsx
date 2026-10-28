import { useId, type FC } from 'react'

import { cn } from '@/lib/cn'

import { fraction } from '../arc'
import { toneFill } from '../tones'
import type { ProgressProps } from './types'
import { percent, progressAria, progressTrack } from './variants'

/**
 * How far along a task is, as a bar. Without a `value`, a sweep shows it's working.
 *
 *   <Progress label="Uploading flyer" value={40} />
 *   <Progress aria-label="Loading events" />
 */
export const Progress: FC<ProgressProps> = ({
  value,
  max = 100,
  label,
  'aria-label': ariaLabel,
  showValue,
  formatValue = percent,
  tone = 'brand',
  size = 'md',
  className,
}) => {
  const labelId = useId()
  const known = value !== null && value !== undefined
  const text = known ? formatValue(value, max) : undefined
  const show = showValue ?? known

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label || (show && text) ? (
        <div className="flex items-baseline justify-between gap-3 text-[0.85rem]">
          {label ? (
            <span id={labelId} className="font-semibold text-ink">
              {label}
            </span>
          ) : (
            <span />
          )}
          {show && text ? (
            <span aria-hidden className="text-muted tabular-nums">
              {text}
            </span>
          ) : null}
        </div>
      ) : null}
      <div {...progressAria(value, max, text)} aria-labelledby={label ? labelId : undefined} aria-label={label ? undefined : ariaLabel} className={progressTrack({ size })}>
        {known ? (
          <div
            className={cn('h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none', toneFill[tone])}
            style={{ width: `${fraction(value, 0, max) * 100}%` }}
          />
        ) : (
          // Sweeps across; with reduced motion, a still partial bar instead
          <div className={cn('absolute inset-y-0 left-0 w-2/5 rounded-full animate-indeterminate motion-reduce:animate-none motion-reduce:opacity-60', toneFill[tone])} />
        )}
      </div>
    </div>
  )
}

export { CircularProgress } from './Circular'
export { RadialProgress } from './Radial'
