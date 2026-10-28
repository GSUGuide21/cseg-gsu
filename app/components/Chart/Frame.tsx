'use client'

import { Table2 } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState, type FC, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Skeleton } from '../Skeleton'
import { Table } from '../Table'
import { formatCompact, num, seriesColor } from './scale'
import type { ChartBaseProps, ChartDatum } from './types'

export interface ChartFrameProps extends ChartBaseProps {
  /** How the legend and tooltip key each series: a square for bars, a stroke for lines */
  mark: 'rect' | 'line'
  /** Draws the plot at a width, with the category under the pointer (or keyboard) */
  plot: (width: number, active: number | null) => ReactNode
  /** Which category is at an x position in the plot */
  indexAt: (x: number, width: number) => number | null
  /** Where a category sits across the plot, for the tooltip */
  anchorAt: (index: number, width: number) => number
  /** Add a total line to the tooltip (stacked bars) */
  total?: boolean
}

/** The plot's width, followed as its box resizes; 0 until it's measured in the browser */
const useWidth = () => {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(Math.round(el.clientWidth))
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(el)
    return () => observer?.disconnect()
  }, [])
  return [ref, width] as const
}

/** A short stroke or square in the series color, beside its name */
const Key: FC<{ mark: 'rect' | 'line'; color: string }> = ({ mark, color }) =>
  mark === 'rect' ? (
    <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />
  ) : (
    <span aria-hidden className="h-0.5 w-3.5 shrink-0 rounded-full" style={{ background: color }} />
  )

/**
 * What every chart shares: the heading, the legend (for two series or more), the tooltip
 * on hover and focus, reading values with the arrow keys, and a table of the same numbers.
 */
export const ChartFrame: FC<ChartFrameProps> = ({
  data,
  x,
  series,
  title,
  description,
  height = 240,
  formatValue = formatCompact,
  formatX = String,
  loading = false,
  headingLevel = 3,
  className,
  mark,
  plot,
  indexAt,
  anchorAt,
  total = false,
}) => {
  const [plotRef, width] = useWidth()
  const [active, setActive] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const id = useId()
  const Heading = `h${headingLevel}` as const
  const empty = data.length === 0

  const tooltipRows = (d: ChartDatum) => series.map((s, i) => ({ s, color: seriesColor(s, i), v: num(d[s.key]) }))
  const say = (i: number) => {
    const d = data[i]
    const parts = tooltipRows(d).map(({ s, v }) => `${s.name} ${v === null ? 'no value' : formatValue(v)}`)
    return `${formatX(d[x] ?? '')}: ${parts.join(', ')}`
  }

  const step = (by: number | 'first' | 'last') =>
    setActive((a) => {
      if (by === 'first') return 0
      if (by === 'last') return data.length - 1
      return a === null ? 0 : Math.min(data.length - 1, Math.max(0, a + by))
    })

  const anchor = active !== null && width ? anchorAt(active, width) : 0
  const onRight = anchor > width / 2

  return (
    <section aria-labelledby={`${id}-title`} className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Heading id={`${id}-title`} className="m-0 text-[1rem] font-bold text-ink">
            {title}
          </Heading>
          {description ? <p className="m-0 text-[0.85rem] text-muted">{description}</p> : null}
        </div>
        {!empty ? (
          <button
            type="button"
            onClick={() => setShowTable(!showTable)}
            aria-expanded={showTable}
            aria-controls={`${id}-table`}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[0.8rem] font-semibold text-ink-soft hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Table2 size={14} aria-hidden />
            {showTable ? 'Hide table' : 'Show table'}
          </button>
        ) : null}
      </div>

      {series.length > 1 ? (
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0" aria-label="Legend">
          {series.map((s, i) => (
            <li key={s.key} className="flex items-center gap-1.5 text-[0.8rem] text-ink-soft">
              <Key mark={mark} color={seriesColor(s, i)} />
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}

      <div ref={plotRef} className="relative" style={{ height }}>
        {empty ? (
          loading ? (
            <Skeleton height={height} className="rounded-xl" />
          ) : (
            <p className="m-0 grid h-full place-items-center rounded-xl border border-dashed border-line text-[0.9rem] text-muted">No data yet</p>
          )
        ) : width > 0 ? (
          <>
            <div
              role="group"
              tabIndex={0}
              aria-roledescription="chart"
              aria-label={`${title}. ${data.length} points; use the left and right arrow keys to read them, or show the table.`}
              aria-busy={loading || undefined}
              onPointerMove={(e) => {
                const box = e.currentTarget.getBoundingClientRect()
                setActive(indexAt(e.clientX - box.left, width))
              }}
              onPointerLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
              onKeyDown={(e) => {
                const by = { ArrowRight: 1, ArrowLeft: -1, Home: 'first', End: 'last' }[e.key] as number | 'first' | 'last' | undefined
                if (by !== undefined) {
                  e.preventDefault()
                  step(by)
                } else if (e.key === 'Escape') setActive(null)
              }}
              className={cn(
                'h-full rounded-md transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand',
                loading && 'opacity-50'
              )}
            >
              <svg width={width} height={height} className="block overflow-visible" aria-hidden>
                {plot(width, active)}
              </svg>
            </div>

            {active !== null ? (
              <div
                aria-hidden
                className="pointer-events-none absolute top-1 z-10 flex min-w-36 flex-col gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-[0.8rem] shadow-[0_8px_24px_rgb(0_0_0/0.12)]"
                // Beside the category, on whichever side has room
                style={onRight ? { right: width - anchor + 12 } : { left: anchor + 12 }}
              >
                <p className="m-0 font-semibold text-ink-soft">{formatX(data[active][x] ?? '')}</p>
                {tooltipRows(data[active]).map(({ s, color, v }) => (
                  <p key={s.key} className="m-0 flex items-center gap-2">
                    <Key mark="line" color={color} />
                    {/* Values lead, names follow */}
                    <span className="font-bold text-ink tabular-nums">{v === null ? '—' : formatValue(v)}</span>
                    <span className="text-ink-soft">{s.name}</span>
                  </p>
                ))}
                {total ? (
                  <p className="m-0 border-t border-line pt-1 text-ink-soft">
                    <span className="font-bold text-ink tabular-nums">
                      {formatValue(tooltipRows(data[active]).reduce((sum, r) => sum + (r.v ?? 0), 0))}
                    </span>{' '}
                    total
                  </p>
                ) : null}
              </div>
            ) : null}
            {/* What the tooltip shows, read out as the arrow keys move */}
            <p aria-live="polite" className="sr-only">
              {active !== null ? say(active) : ''}
            </p>
          </>
        ) : null}
      </div>

      {showTable ? (
        <div id={`${id}-table`}>
          <Table
            caption={title}
            hideCaption
            density="compact"
            stackOnNarrow={false}
            rows={data.map((d, i): ChartDatum => ({ ...d, __row: String(i) }))}
            getRowId={(d) => String(d.__row)}
            columns={[
              { key: x, header: x.charAt(0).toUpperCase() + x.slice(1), rowHeader: true, cell: (d) => formatX(d[x] ?? '') },
              ...series.map((s) => ({
                key: s.key,
                header: s.name,
                align: 'end' as const,
                cell: (d: ChartDatum) => {
                  const v = num(d[s.key])
                  return <span className="tabular-nums">{v === null ? '—' : formatValue(v)}</span>
                },
              })),
            ]}
          />
        </div>
      ) : null}
    </section>
  )
}
