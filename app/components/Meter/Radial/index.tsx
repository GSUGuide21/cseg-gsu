import type { FC } from 'react'

import { cn } from '@/lib/cn'

import { DEFAULT_SECTOR, arcPath, centerText, fraction, polar } from '../../arc'
import { toneStroke, toneText } from '../../tones'
import type { RadialMeterProps } from '../types'
import { STATUS_WORD, meterState } from '../variants'

/**
 * A measurement within a known range, as a gauge: an arc over part of a circle (`sector`)
 * with the value and its status in the middle, and ticks where the range's parts meet.
 *
 *   <RadialMeter label="Password strength" value={3} max={4} low={1} high={2.5} optimum={4} formatValue={(v) => ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][v]} />
 */
export const RadialMeter: FC<RadialMeterProps> = ({
  value,
  label,
  'aria-label': ariaLabel,
  showValue = true,
  size = 112,
  thickness = 9,
  sector = DEFAULT_SECTOR,
  ticks = true,
  className,
  children,
  ...range
}) => {
  const m = meterState({ value, ...range })
  const r = (size - thickness) / 2
  const c = size / 2
  const d = arcPath(c, c, r, sector.startAngle, sector.endAngle)
  const angleOf = (n: number) => sector.startAngle + fraction(n, m.min, m.max) * (sector.endAngle - sector.startAngle)
  const tickAt = (n: number | undefined) => {
    if (n === undefined || n <= m.min || n >= m.max) return null
    const a = angleOf(n)
    const inner = polar(c, c, r - thickness / 2 - 2, a)
    const outer = polar(c, c, r - thickness / 2 - 6, a)
    return <line key={n} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} strokeWidth={1.5} strokeLinecap="round" className="stroke-ink-faint" />
  }

  return (
    <div {...m.aria} aria-label={label ?? ariaLabel} className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <path d={d} fill="none" strokeWidth={thickness} strokeLinecap="round" className="stroke-line" />
        <path
          d={d}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${fraction(value, m.min, m.max) * 100} 100`}
          className={cn(toneStroke[m.tone], 'transition-[stroke-dasharray] duration-300 motion-reduce:transition-none')}
        />
        {ticks ? [tickAt(range.low), tickAt(range.high)] : null}
      </svg>
      {children ??
        (showValue ? (
          <span aria-hidden className="absolute flex flex-col items-center leading-tight">
            <span className="text-center font-bold text-balance text-ink tabular-nums" style={centerText(m.text, size, thickness, size * 0.19, m.status ? 15 : 0)}>
              {m.text}
            </span>
            {m.status ? <span className={cn('text-[0.7rem] font-semibold capitalize', toneText[m.tone])}>{STATUS_WORD[m.status]}</span> : null}
          </span>
        ) : null)}
    </div>
  )
}
