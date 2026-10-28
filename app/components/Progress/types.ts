import type { ReactNode } from 'react'

import type { Tone } from '../tones'

export type ProgressSector = {
    startAngle: number // The starting angle of the sector in radians (default 0)
    endAngle: number // The ending angle of the sector in radians (default 2π)
}

interface SharedProgressProps {
  /** How much is done, 0 to `max`; null (or left out) means "working, amount unknown" */
  value?: number | null
  /** Default 100 */
  max?: number
  /** Visible label above (bars) or the accessible name (rings), e.g. "Uploading flyer" */
  label?: string
  /** Accessible name when there's no visible label */
  'aria-label'?: string
  /** Shows the amount, e.g. "40%". Default true when there's a value. */
  showValue?: boolean
  /** How the amount reads, e.g. (v, max) => `${v} of ${max} files`. Default a percentage. */
  formatValue?: (value: number, max: number) => string
  tone?: Tone
  className?: string
}

export interface ProgressProps extends SharedProgressProps {
  /** Bar thickness. Default "md". */
  size?: 'sm' | 'md' | 'lg'
}

export interface CircularProgressProps extends SharedProgressProps {
  /** Width and height in px. Default 64. */
  size?: number
  /** Ring thickness in px. Default 6. */
  thickness?: number
  /** Shown in the middle instead of the amount */
  children?: ReactNode
}

export interface RadialProgressProps extends CircularProgressProps {
  /** Which part of the circle the gauge sweeps. Default three quarters, open at the bottom. */
  sector?: ProgressSector
}
