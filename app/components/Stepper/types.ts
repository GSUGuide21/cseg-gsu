import type { ReactNode } from 'react'

export type StepStatus = 'complete' | 'current' | 'upcoming' | 'error'

export interface StepItem {
  label: ReactNode
  description?: ReactNode
  /** Says "Optional" under the label */
  optional?: boolean
  /** Overrides the status worked out from `current`; "error" marks a step that needs fixing */
  status?: StepStatus
}

export interface StepperProps {
  steps: StepItem[]
  /** The step being worked on, from 0. Steps before it are complete. */
  current: number
  /**
   * Lets people go back to a step by pressing it: "complete" steps only (default when
   * `onStepChange` is set), or "all" of them.
   */
  navigable?: 'complete' | 'all'
  onStepChange?: (index: number) => void
  /** "horizontal" (default) stacks on narrow screens; "vertical" always stacks */
  orientation?: 'horizontal' | 'vertical'
  /** Names the steps: "Create an event" */
  'aria-label': string
  className?: string
}
