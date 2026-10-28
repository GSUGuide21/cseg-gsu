'use client'

import type { FC } from 'react'

import { ChartFrame } from './Frame'
import { allValues, formatCompact, linear, niceTicks, num, seriesColor, textWidth } from './scale'
import type { BarChartProps } from './types'

/** Bars are at most this thick, however wide the space; the rest is air */
const MAX_BAR = 24
/** Surface-colored gap between touching bars and stacked segments */
const GAP = 2

/** A bar from the baseline to its value, rounded (4px) only at the value end */
const barPath = (x: number, base: number, end: number, w: number) => {
  const h = Math.abs(base - end)
  const r = Math.min(4, w / 2, h)
  const up = end < base
  const e = up ? end + r : end - r
  return `M ${x} ${base} V ${e} Q ${x} ${end} ${x + r} ${end} H ${x + w - r} Q ${x + w} ${end} ${x + w} ${e} V ${base} Z`
}

/**
 * Amounts by category: RSVPs per event, members per major. Side by side for a few series,
 * or `stacked` to show a total and its parts.
 *
 *   <BarChart title="RSVPs by event" x="event" series={[{ key: 'rsvps', name: 'RSVPs' }]} data={rows} />
 *
 * Hover or focus (then the arrow keys) shows every series for a category; "Show table"
 * lists all the numbers.
 */
export const BarChart: FC<BarChartProps> = (props) => {
  const { data, x, series, height = 240, formatValue = formatCompact, formatX = String, stacked = false } = props
  const n = data.length

  const totals = data.map((d) => series.reduce((sum, s) => sum + Math.max(0, num(d[s.key]) ?? 0), 0))
  const values = stacked ? totals : allValues(data, series)
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values), Math.max(3, Math.round(height / 45)))
  const left = Math.max(...ticks.map((t) => textWidth(formatValue(t)))) + 12
  const top = 18
  const bottom = 26

  const layout = (width: number) => {
    const plotW = Math.max(1, width - left - 4)
    const band = plotW / Math.max(1, n)
    const y = linear([ticks[0], ticks[ticks.length - 1]], [height - bottom, top])
    const k = stacked ? 1 : series.length
    const thick = Math.max(2, Math.min(MAX_BAR, (band * 0.72 - (k - 1) * GAP) / k))
    const groupW = k * thick + (k - 1) * GAP
    return { band, y, thick, groupW, x0: (i: number) => left + i * band + (band - groupW) / 2 }
  }

  return (
    <ChartFrame
      {...props}
      mark="rect"
      total={stacked && series.length > 1}
      indexAt={(px, width) => {
        const { band } = layout(width)
        const i = Math.floor((px - left) / band)
        return i >= 0 && i < n ? i : null
      }}
      anchorAt={(i, width) => {
        const { x0, groupW } = layout(width)
        return x0(i) + groupW / 2
      }}
      plot={(width, active) => {
        const { band, y, thick, groupW, x0 } = layout(width)
        const base = y(0)
        // Label the tallest bar (or stack) only; the axis, tooltip, and table carry the rest
        const labelled = series.length === 1 || stacked ? totals.indexOf(Math.max(...totals)) : -1
        const maxLabel = Math.max(...data.map((d) => textWidth(formatX(d[x] ?? ''))))
        const every = Math.max(1, Math.ceil((maxLabel + 10) / band))

        return (
          <>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={left} x2={width} y1={y(t)} y2={y(t)} strokeWidth={1} className={t === 0 ? 'stroke-ink-faint/50' : 'stroke-line'} />
                <text x={left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                  {formatValue(t)}
                </text>
              </g>
            ))}
            {active !== null ? <rect x={left + active * band + 2} y={top - 6} width={band - 4} height={height - top - bottom + 6} rx={6} className="fill-ink/5" /> : null}
            {data.map((d, i) => {
              let stackTop = base
              return (
                <g key={i}>
                  {series.map((s, j) => {
                    const v = num(d[s.key])
                    if (v === null || v === 0) return null
                    const color = seriesColor(s, j)
                    if (stacked) {
                      const from = stackTop - (stackTop < base ? GAP : 0)
                      const to = stackTop - (base - y(Math.max(0, v)))
                      stackTop = to
                      if (from - to <= 0.5) return null
                      const last = series.slice(j + 1).every((r) => !num(d[r.key]))
                      return last ? (
                        <path key={s.key} d={barPath(x0(i), from, to, thick)} style={{ fill: color }} />
                      ) : (
                        <rect key={s.key} x={x0(i)} y={to} width={thick} height={from - to} style={{ fill: color }} />
                      )
                    }
                    return <path key={s.key} d={barPath(x0(i) + j * (thick + GAP), base, y(v), thick)} style={{ fill: color }} />
                  })}
                  {i === labelled && textWidth(formatValue(totals[i])) <= band ? (
                    <text x={x0(i) + groupW / 2} y={y(totals[i]) - 6} textAnchor="middle" className="fill-ink-soft text-[11px] font-semibold tabular-nums">
                      {formatValue(totals[i])}
                    </text>
                  ) : null}
                  {i % every === 0 ? (
                    <text x={left + i * band + band / 2} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                      {formatX(d[x] ?? '')}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </>
        )
      }}
    />
  )
}
