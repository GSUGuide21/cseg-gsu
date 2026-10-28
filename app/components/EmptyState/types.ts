import type { ReactNode } from 'react'

export interface EmptyStateProps {
  /** A picture of what's missing: a calendar for events, people for members */
  icon?: ReactNode
  title: ReactNode
  /** Why it's empty, or what to do about it */
  description?: ReactNode
  /** What to do next: a Button or two */
  actions?: ReactNode
  /** "md" for a page or panel; "sm" inside a table or card. Default "md". */
  size?: 'sm' | 'md'
  /** A dashed outline around it, for an empty area of a page */
  bordered?: boolean
  /** The title's heading level; leave out inside a table, where it's plain text */
  headingLevel?: 2 | 3 | 4
  className?: string
}
