import type { ReactNode } from 'react'

export interface CardProps {
  /** The card's heading */
  title?: ReactNode
  /** Heading level for `title`, so cards fit the page's outline. Default 3. */
  headingLevel?: 2 | 3 | 4
  /** Small uppercase label above the title */
  eyebrow?: ReactNode
  description?: ReactNode
  /** An image or other media across the top, edge to edge */
  media?: ReactNode
  /** Actions or details along the bottom */
  footer?: ReactNode
  /**
   * Makes the whole card a link to here; the title is the link's text. Keep other
   * links and buttons out of a linked card (in `footer` they still work, above it).
   */
  href?: string
  /** The blue-tinted highlight treatment, for featured cards */
  accent?: boolean
  /** The element: "article" for standalone content (default), "section", "li", or "div" */
  as?: 'article' | 'section' | 'li' | 'div'
  className?: string
  children?: ReactNode
}
