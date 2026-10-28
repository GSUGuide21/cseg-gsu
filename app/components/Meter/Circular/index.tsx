import type { FC } from 'react'

import { cn } from '@/lib/cn'

import { arcPath, centerText, fraction } from '../../arc'
import { toneStroke } from '../../tones'
import type { CircularMeterProps } from '../types'
import { meterState } from '../variants'

/**
 * A measurement within a known range, as a ring with the value in the middle.
 *
 *   <CircularMeter label="Attendance" value={82} formatValue={(v) => `${v}%`} low={60} high={90} optimum={100} />
 */
export const CircularMeter: FC<CircularMeterProps> = ({
  value,
  label,
  'aria-label': ariaLabel,
  showValue = true,
  size = 72,
  thickness = 7,
  className,
  children,
  ...range
}) => {
  const m = meterState({ value, ...range })
  const r = (size - thickness) / 2
  const c = size / 2
  return (
    <div {...m.aria} aria-label={label ?? ariaLabel} className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={thickness} className="stroke-line" />
        <path
          d={arcPath(c, c, r, 0, Math.PI * 2)}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${fraction(value, m.min, m.max) * 100} 100`}
          className={cn(toneStroke[m.tone], 'transition-[stroke-dasharray] duration-300 motion-reduce:transition-none')}
        />
      </svg>
      {children ??
        (showValue ? (
          <span aria-hidden className="absolute text-center leading-tight font-bold text-balance text-ink tabular-nums" style={centerText(m.text, size, thickness, size * 0.22)}>
            {m.text}
          </span>
        ) : null)}
    </div>
  )
}
