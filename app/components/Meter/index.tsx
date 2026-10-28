import { useId, type FC } from 'react'

import { cn } from '@/lib/cn'

import { fraction } from '../arc'
import { progressTrack } from '../Progress/variants'
import { toneFill, toneText } from '../tones'
import type { MeterProps } from './types'
import { STATUS_WORD, meterState } from './variants'

/**
 * A measurement within a known range, as a bar: seats filled, a password's strength,
 * storage used. (For how far along a task is, use Progress.)
 *
 *   <Meter label="Seats filled" value={34} max={40} low={20} high={36} optimum={10} />
 */
export const Meter: FC<MeterProps> = ({
  value,
  label,
  'aria-label': ariaLabel,
  showValue = true,
  size = 'md',
  className,
  ...range
}) => {
  const labelId = useId()
  const m = meterState({ value, ...range })
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label || showValue ? (
        <div className="flex items-baseline justify-between gap-3 text-[0.85rem]">
          {label ? (
            <span id={labelId} className="font-semibold text-ink">
              {label}
            </span>
          ) : (
            <span />
          )}
          {showValue ? (
            <span aria-hidden className="flex items-baseline gap-1.5 text-muted tabular-nums">
              {m.text}
              {m.status ? <span className={cn('text-[0.75rem] font-semibold capitalize', toneText[m.tone])}>{STATUS_WORD[m.status]}</span> : null}
            </span>
          ) : null}
        </div>
      ) : null}
      <div {...m.aria} aria-labelledby={label ? labelId : undefined} aria-label={label ? undefined : ariaLabel} className={progressTrack({ size })}>
        <div className={cn('h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none', toneFill[m.tone])} style={{ width: `${fraction(value, m.min, m.max) * 100}%` }} />
      </div>
    </div>
  )
}

export { CircularMeter } from './Circular'
export { RadialMeter } from './Radial'
