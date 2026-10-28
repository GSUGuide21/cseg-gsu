import type { ReactNode } from 'react'

import type { Tone } from '../tones'

export type MeterSector = {
    startAngle: number // The starting angle of the sector in radians (default 0)
    endAngle: number // The ending angle of the sector in radians (default 2π)
}

/** How a value sits against its ideal: in the best range, next to it, or furthest away */
export type MeterStatus = 'good' | 'fair' | 'poor'

interface SharedMeterProps {
  value: number
  /** Default 0 */
  min?: number
  /** Default 100 */
  max?: number
  /**
   * Splits the range into low (below `low`), middle, and high (above `high`) parts, as the
   * HTML <meter> does. With `optimum` saying which part is best, the meter colors itself:
   * green in the best part, amber next to it, red furthest away.
   */
  low?: number
  high?: number
  /** Where the ideal value sits: below `low`, between, or above `high` */
  optimum?: number
  /** Visible label (bars) or accessible name (rings and gauges), e.g. "Seats filled" */
  label?: string
  'aria-label'?: string
  /** Shows the value. Default true. */
  showValue?: boolean
  /** How the value reads, e.g. (v) => `${v} of 40 seats`. Default the number. */
  formatValue?: (value: number, min: number, max: number) => string
  /** A fixed color instead of the good/fair/poor one */
  tone?: Tone
  className?: string
}

export interface MeterProps extends SharedMeterProps {
  size?: 'sm' | 'md' | 'lg'
}

export interface CircularMeterProps extends SharedMeterProps {
  /** Width and height in px. Default 72. */
  size?: number
  thickness?: number
  /** Shown in the middle instead of the value */
  children?: ReactNode
}

export interface RadialMeterProps extends CircularMeterProps {
  /** Which part of the circle the gauge sweeps. Default three quarters, open at the bottom. */
  sector?: MeterSector
  /** Small tick marks at `low` and `high`, so the parts of the range show. Default true. */
  ticks?: boolean
}
