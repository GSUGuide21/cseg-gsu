'use client'

import type { FC } from 'react'

import { ChartFrame } from './Frame'
import { allValues, formatCompact, linear, niceTicks, num, seriesColor, textWidth } from './scale'
import type { LineChartProps } from './types'

/**
 * Change over time: weekly RSVPs, members by month. Up to about four series read well.
 *
 *   <LineChart title="Members" x="month" series={[{ key: 'members', name: 'Members' }]} data={rows} area />
 *
 * A crosshair follows the pointer (or the arrow keys) and the tooltip lists every series
 * at that point; the latest value of each line is labelled at its end when they don't crowd.
 */
export const LineChart: FC<LineChartProps> = (props) => {
  const { data, x, series, height = 240, formatValue = formatCompact, formatX = String, area = false, zero = true } = props
  const n = data.length

  const values = allValues(data, series)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const ticks = niceTicks(zero ? Math.min(0, lo) : lo, zero ? Math.max(0, hi) : hi, Math.max(3, Math.round(height / 45)))
  const left = Math.max(...ticks.map((t) => textWidth(formatValue(t)))) + 12
  const top = 10
  const bottom = 26

  // Each line's last value, labelled at its end unless the labels would crowd each other
  const ends = series.map((s) => {
    for (let i = n - 1; i >= 0; i--) {
      const v = num(data[i][s.key])
      if (v !== null) return { i, v }
    }
    return null
  })
  const y0 = linear([ticks[0], ticks[ticks.length - 1]], [height - bottom, top])
  const endYs = ends.map((e) => (e ? y0(e.v) : null)).filter((v): v is number => v !== null)
  const labelEnds = series.length <= 4 && endYs.every((a, i) => endYs.every((b, j) => i === j || Math.abs(a - b) >= 14))
  const right = labelEnds ? Math.max(...ends.map((e) => (e ? textWidth(formatValue(e.v)) : 0))) + 14 : 8

  const layout = (width: number) => {
    const plotW = Math.max(1, width - left - right)
    const stepW = n > 1 ? plotW / (n - 1) : 0
    return { plotW, stepW, px: (i: number) => (n > 1 ? left + i * stepW : left + plotW / 2) }
  }

  return (
    <ChartFrame
      {...props}
      mark="line"
      indexAt={(p, width) => {
        const { stepW } = layout(width)
        if (n < 2) return 0
        return Math.min(n - 1, Math.max(0, Math.round((p - left) / stepW)))
      }}
      anchorAt={(i, width) => layout(width).px(i)}
      plot={(width, active) => {
        const { plotW, stepW, px } = layout(width)
        const y = y0
        const base = y(zero ? 0 : ticks[0])
        const maxLabel = Math.max(...data.map((d) => textWidth(formatX(d[x] ?? ''))))
        const every = n > 1 ? Math.max(1, Math.ceil((maxLabel + 14) / stepW)) : 1

        // A line breaks where a value is missing
        const runs = (key: string) => {
          const out: { i: number; v: number }[][] = []
          let run: { i: number; v: number }[] = []
          data.forEach((d, i) => {
            const v = num(d[key])
            if (v === null) {
              if (run.length) out.push(run)
              run = []
            } else run.push({ i, v })
          })
          if (run.length) out.push(run)
          return out
        }

        return (
          <>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} strokeWidth={1} className={t === 0 ? 'stroke-ink-faint/50' : 'stroke-line'} />
                <text x={left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                  {formatValue(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              if (i % every !== 0) return null
              const label = formatX(d[x] ?? '')
              const w = textWidth(label)
              // Keep the end labels inside the chart
              const cx = px(i)
              const anchor = cx - w / 2 < 0 ? 'start' : cx + w / 2 > width ? 'end' : 'middle'
              return (
                <text key={i} x={anchor === 'start' ? Math.max(0, cx - 4) : cx} y={height - 8} textAnchor={anchor} className="fill-muted text-[11px]">
                  {label}
                </text>
              )
            })}
            {active !== null ? <line x1={px(active)} x2={px(active)} y1={top} y2={height - bottom} strokeWidth={1} className="stroke-ink-faint/60" /> : null}
            {series.map((s, j) => {
              const color = seriesColor(s, j)
              return (
                <g key={s.key}>
                  {runs(s.key).map((run, r) => {
                    const line = run.map((p, k) => `${k ? 'L' : 'M'} ${px(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
                    return (
                      <g key={r}>
                        {area && run.length > 1 ? (
                          <path d={`${line} L ${px(run[run.length - 1].i).toFixed(1)} ${base} L ${px(run[0].i).toFixed(1)} ${base} Z`} style={{ fill: color }} opacity={0.1} />
                        ) : null}
                        <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" style={{ stroke: color }} />
                      </g>
                    )
                  })}
                </g>
              )
            })}
            {/* Points on top of every line: the active ones, and each line's end */}
            {series.map((s, j) => {
              const color = seriesColor(s, j)
              const end = ends[j]
              const at = active !== null ? num(data[active][s.key]) : null
              return (
                <g key={s.key}>
                  {active !== null && at !== null ? <circle cx={px(active)} cy={y(at)} r={4.5} strokeWidth={2} className="stroke-surface" style={{ fill: color }} /> : null}
                  {end && end.i !== active ? <circle cx={px(end.i)} cy={y(end.v)} r={4} strokeWidth={2} className="stroke-surface" style={{ fill: color }} /> : null}
                  {end && labelEnds ? (
                    <text x={px(end.i) + 10} y={y(end.v)} dy="0.32em" className="fill-ink-soft text-[11px] font-semibold tabular-nums">
                      {formatValue(end.v)}
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
