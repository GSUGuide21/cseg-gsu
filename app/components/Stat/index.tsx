import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Skeleton } from '../Skeleton'
import type { StatProps } from './types'

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/** 1,284 stays as it is; 12,900 becomes 12.9K */
export const formatStat = (n: number) => (Math.abs(n) >= 10_000 ? compact.format(n) : grouped.format(n))

const W = 112
const H = 36
const PAD = 5

/** Recent values as a quiet line, the current one marked */
const Sparkline: FC<{ values: number[] }> = ({ values }) => {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, values.length - 1)
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2)
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = values.length - 1
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0 overflow-visible">
      <polyline points={points} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-ink-faint/60" />
      {/* The current period in the accent, ringed in the surface color */}
      <circle cx={x(last)} cy={y(values[last])} r={4} strokeWidth={2} className="fill-brand stroke-surface" />
    </svg>
  )
}

/**
 * One number that matters, with how it's changed: a dashboard's tiles.
 *
 *   <Stat label="Active members" value={1284} delta={{ value: 12, period: 'vs last month' }} trend={weekly} />
 *   <Stat label="No-shows" value="8%" delta={{ value: 3, period: 'vs last event', goodWhen: 'down' }} />
 *
 * The change is colored by whether it's good news (not just which way it went), and said
 * in words too: "Up 12% vs last month".
 */
export const Stat: FC<StatProps> = ({
  label,
  value,
  format,
  delta,
  trend,
  trendLabel,
  icon,
  description,
  href,
  loading = false,
  className,
}) => {
  const shownValue = typeof value === 'number' ? (format ?? formatStat)(value) : value

  let change: ReactNode = null
  if (delta) {
    const { value: d, period, format: f = 'percent', goodWhen = 'up' } = delta
    const dir = d > 0 ? 'up' : d < 0 ? 'down' : 'flat'
    const good = dir === 'flat' ? null : dir === goodWhen
    const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : ArrowRight
    const amount = `${grouped.format(Math.abs(d))}${f === 'percent' ? '%' : ''}`
    change = (
      <p className="m-0 flex flex-wrap items-center gap-x-1.5 text-[0.82rem]">
        <span className={cn('inline-flex items-center gap-0.5 font-bold', good === null ? 'text-ink-soft' : good ? 'text-success' : 'text-danger')}>
          <Icon size={15} strokeWidth={2.5} aria-hidden />
          <span aria-hidden>
            {dir === 'down' ? '−' : dir === 'up' ? '+' : ''}
            {amount}
          </span>
          <span className="sr-only">{dir === 'flat' ? 'No change' : `${dir === 'up' ? 'Up' : 'Down'} ${amount}`}</span>
        </span>
        <span className="text-muted">{period}</span>
      </p>
    )
  }

  const trendWords =
    trend && trend.length > 1
      ? `${trendLabel ? `Trend, ${trendLabel}` : 'Trend'}: from ${formatStat(trend[0])} to ${formatStat(trend[trend.length - 1])}, low ${formatStat(Math.min(...trend))}, high ${formatStat(Math.max(...trend))}`
      : null

  return (
    <div
      aria-busy={loading || undefined}
      className={cn(
        'relative flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-5',
        href && 'transition-[border-color,box-shadow] hover:border-brand-edge hover:shadow-[0_4px_16px_rgb(0_0_0/0.06)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {href ? (
          // The label is the link; it stretches over the whole tile
          <Link href={href} className="text-[0.85rem] font-semibold text-ink-soft no-underline outline-none after:absolute after:inset-0 after:rounded-xl">
            {label}
          </Link>
        ) : (
          <p className="m-0 text-[0.85rem] font-semibold text-ink-soft">{label}</p>
        )}
        {icon ? <span className="text-muted [&>svg]:size-4.5">{icon}</span> : null}
      </div>
      {loading ? (
        <>
          <Skeleton width="55%" height={34} />
          <Skeleton shape="text" width="70%" />
        </>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <p className="m-0 text-[clamp(1.6rem,3vw,2rem)] leading-none font-bold tracking-tight text-ink">{shownValue}</p>
            {trend && trend.length > 1 ? <Sparkline values={trend} /> : null}
          </div>
          {trendWords ? <span className="sr-only">{trendWords}</span> : null}
          {change}
          {description ? <p className="m-0 text-[0.82rem] text-muted">{description}</p> : null}
        </>
      )}
    </div>
  )
}

/** Tiles in a row that wraps: as many as fit at 14rem or more each */
export const StatGroup: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4', className)}>{children}</div>
)
