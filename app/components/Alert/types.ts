import type { ReactNode } from 'react'

import type { Tone } from '../tones'

export type AlertTone = Exclude<Tone, 'brand'>

export interface AlertProps {
  /** "info" (default), "success", "warning", "danger", or "neutral" */
  tone?: AlertTone
  title?: ReactNode
  children?: ReactNode
  /** Replaces the tone's icon; `false` for none */
  icon?: ReactNode | false
  /** Buttons or links, under the message */
  actions?: ReactNode
  /** Shows a close button */
  onDismiss?: () => void
  /**
   * Announce it when it appears (a form error after submitting, a saved message): warnings
   * and dangers interrupt, the rest wait their turn. Leave off for alerts that are there
   * when the page loads.
   */
  live?: boolean
  className?: string
}
