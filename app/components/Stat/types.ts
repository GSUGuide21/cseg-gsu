import type { ReactNode } from 'react'

export interface StatDelta {
  /** The change: 12 for +12% (or +12, with format "number"); negative for a drop */
  value: number
  /** What it's compared with: "vs last week" */
  period: string
  /** Default "percent" */
  format?: 'percent' | 'number'
  /** Whether going up is good news (members) or bad (no-shows). Default "up". */
  goodWhen?: 'up' | 'down'
}

export interface StatProps {
  /** What's counted, in sentence case: "Active members" */
  label: string
  /** A number (shortened from 10,000 up: 12.9K) or text you've formatted */
  value: number | string
  /** Formats a number value your way: (n) => `$${n}` */
  format?: (value: number) => string
  delta?: StatDelta
  /** Recent values, oldest first, drawn as a small line; the last is the current period */
  trend?: number[]
  /** What `trend` covers, for screen readers: "last 12 weeks" */
  trendLabel?: string
  icon?: ReactNode
  /** A line under the value */
  description?: ReactNode
  /** Makes the whole tile a link to the details */
  href?: string
  loading?: boolean
  className?: string
}
