import type { ReactNode } from 'react'

/** One row of data: the category or date at `x`, and a value for each series' key */
export type ChartDatum = Record<string, string | number | null | undefined>

export interface ChartSeries {
  /** Where its values are in each row */
  key: string
  /** Its name in the legend, tooltip, and table */
  name: string
  /**
   * Which of the eight chart colors (1–8) it wears. Default: its place in `series`. Pin
   * it when series can be filtered out, so the ones left keep their colors.
   */
  slot?: number
}

export interface ChartBaseProps {
  data: ChartDatum[]
  /** The key of each row's category or date */
  x: string
  series: ChartSeries[]
  /** Says what's plotted; shown as the chart's heading */
  title: string
  /** A line under the title: the unit, the period, where it's from */
  description?: ReactNode
  /** The plot's height in pixels. Default 240. */
  height?: number
  /** Formats values on the axis, labels, tooltip, and table. Default: 1,284 / 12.9K. */
  formatValue?: (value: number) => string
  /** Formats the x labels: (v) => short month names, say */
  formatX?: (value: string | number) => string
  /** Dims the chart while new data loads (or shows a placeholder before the first) */
  loading?: boolean
  /** The title's heading level. Default 3. */
  headingLevel?: 2 | 3 | 4
  className?: string
}

export interface BarChartProps extends ChartBaseProps {
  /** Stack the series in one bar per category, instead of side by side */
  stacked?: boolean
}

export interface LineChartProps extends ChartBaseProps {
  /** A pale wash under each line */
  area?: boolean
  /** Start the value axis at zero. Default true; turn off to zoom in on small changes. */
  zero?: boolean
}
