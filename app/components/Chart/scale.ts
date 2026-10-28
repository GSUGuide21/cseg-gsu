import type { ChartDatum, ChartSeries } from './types'

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/** 950, 1.2K, 3M: short enough for an axis */
export const formatCompact = (n: number) => (Math.abs(n) >= 1000 ? compact.format(n) : plain.format(n))

/**
 * Round tick values covering min..max, about `count` of them, on steps of 1, 2, or 5 × 10ⁿ.
 * Returns the ticks, which run from at or below min to at or above max.
 */
export const niceTicks = (min: number, max: number, count = 5) => {
  if (min === max) {
    if (min === 0) return [0, 1]
    ;[min, max] = min > 0 ? [0, max] : [min, 0]
  }
  const raw = (max - min) / Math.max(1, count)
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  // Rounded to the step's precision, so 0.1 + 0.2 doesn't print as 0.30000000000000004
  const digits = Math.max(0, -Math.floor(Math.log10(step)) + 1)
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toFixed(digits)))
  return ticks
}

/** Maps a value to a pixel, between the domain's ends */
export const linear = (domain: [number, number], range: [number, number]) => {
  const [d0, d1] = domain
  const [r0, r1] = range
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0)
  return (v: number) => r0 + (v - d0) * k
}

export const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** The CSS color for a series: its pinned slot, or its place in the list */
export const seriesColor = (s: ChartSeries, i: number) => `var(--series-${Math.min(8, Math.max(1, s.slot ?? i + 1))})`

/** Roughly how wide a label is in the axis font, for spacing and margins */
export const textWidth = (text: string, px = 11) => text.length * px * 0.6

/** Every value of every series, for the axis's range */
export const allValues = (data: ChartDatum[], series: ChartSeries[]) =>
  data.flatMap((d) => series.map((s) => num(d[s.key]))).filter((v): v is number => v !== null)
