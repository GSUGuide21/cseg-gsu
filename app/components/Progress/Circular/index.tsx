import type { FC } from 'react'

import { cn } from '@/lib/cn'

import { arcPath, centerText, fraction } from '../../arc'
import { toneStroke } from '../../tones'
import type { CircularProgressProps } from '../types'
import { percent, progressAria } from '../variants'

/**
 * How far along a task is, as a ring, with the amount in the middle. Without a `value`
 * a quarter-ring spins to show it's working.
 *
 *   <CircularProgress label="Profile complete" value={3} max={5} formatValue={(v, m) => `${v}/${m}`} />
 */
export const CircularProgress: FC<CircularProgressProps> = ({
  value,
  max = 100,
  label,
  'aria-label': ariaLabel,
  showValue,
  formatValue = percent,
  tone = 'brand',
  size = 64,
  thickness = 6,
  className,
  children,
}) => {
  const known = value !== null && value !== undefined
  const text = known ? formatValue(value, max) : undefined
  const r = (size - thickness) / 2
  const c = size / 2

  return (
    <div
      {...progressAria(value, max, text)}
      aria-label={label ?? ariaLabel}
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className={cn(!known && 'animate-spin motion-reduce:animate-[spin_2.5s_linear_infinite]')}>
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={thickness} className="stroke-line" />
        <path
          d={arcPath(c, c, r, 0, Math.PI * 2)}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          // pathLength 100 makes the dash length a percentage
          pathLength={100}
          strokeDasharray={`${known ? fraction(value, 0, max) * 100 : 25} 100`}
          className={cn(toneStroke[tone], 'transition-[stroke-dasharray] duration-300 motion-reduce:transition-none')}
        />
      </svg>
      {children ?? ((showValue ?? known) && text ? (
        <span aria-hidden className="absolute text-center leading-tight font-bold text-balance text-ink tabular-nums" style={centerText(text, size, thickness, size * 0.22)}>
          {text}
        </span>
      ) : null)}
    </div>
  )
}
