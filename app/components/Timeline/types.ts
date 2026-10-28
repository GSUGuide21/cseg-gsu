import type { ReactNode } from 'react'

import type { Tone } from '../tones'

export interface TimelineItem {
  id: string
  /** What happened: "Jordan RSVP'd to Welcome Week" */
  title: ReactNode
  description?: ReactNode
  /** When: a Date or an ISO string */
  time?: Date | string
  /** An icon in the marker; without one (or an avatar) it's a dot */
  icon?: ReactNode
  /** The marker's color. Default "neutral". */
  tone?: Tone
  /** A person's avatar as the marker, in place of an icon */
  avatar?: { name: string; src?: string | null }
  /** Anything more under it: a quote, a card, buttons */
  content?: ReactNode
}

export interface TimelineProps {
  /** Newest first, usually; shown in the order given */
  items: TimelineItem[]
  /** "relative" (3 hours ago), "absolute" (Oct 27, 2:30 PM), or your own. Default "relative". */
  timeFormat?: 'relative' | 'absolute' | ((time: Date) => string)
  /** Headings by day: Today, Yesterday, Oct 24 */
  groupByDay?: boolean
  /** Names the list: "Recent activity" */
  'aria-label'?: string
  className?: string
}
