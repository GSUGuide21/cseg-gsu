import type { FC } from 'react'

import { cn } from '@/lib/cn'

import { DEFAULT_SECTOR, arcPath, centerText, fraction } from '../../arc'
import { toneStroke } from '../../tones'
import type { RadialProgressProps } from '../types'
import { percent, progressAria } from '../variants'

/**
 * How far along a task is, as a gauge: an arc over part of a circle (`sector`), filling
 * from its start. Without a `value` the fill pulses to show it's working.
 *
 *   <RadialProgress label="Semester" value={9} max={16} formatValue={(v) => `Week ${v}`} />
 *   <RadialProgress value={70} sector={{ startAngle: -Math.PI / 2, endAngle: Math.PI / 2 }} />  // a half circle
 */
export const RadialProgress: FC<RadialProgressProps> = ({
  value,
  max = 100,
  label,
  'aria-label': ariaLabel,
  showValue,
  formatValue = percent,
  tone = 'brand',
  size = 96,
  thickness = 8,
  sector = DEFAULT_SECTOR,
  className,
  children,
}) => {
  const known = value !== null && value !== undefined
  const text = known ? formatValue(value, max) : undefined
  const r = (size - thickness) / 2
  const c = size / 2
  const d = arcPath(c, c, r, sector.startAngle, sector.endAngle)

  return (
    <div
      {...progressAria(value, max, text)}
      aria-label={label ?? ariaLabel}
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <path d={d} fill="none" strokeWidth={thickness} strokeLinecap="round" className="stroke-line" />
        <path
          d={d}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${known ? fraction(value, 0, max) * 100 : 100} 100`}
          className={cn(toneStroke[tone], 'transition-[stroke-dasharray] duration-300 motion-reduce:transition-none', !known && 'animate-pulse')}
        />
      </svg>
      {children ?? ((showValue ?? known) && text ? (
        <span aria-hidden className="absolute text-center leading-tight font-bold text-balance text-ink tabular-nums" style={centerText(text, size, thickness, size * 0.2)}>
          {text}
        </span>
      ) : null)}
    </div>
  )
}
