import type { ReactNode } from 'react'

export interface AccordionItemData {
  /** Stable id; also what `defaultOpen` refers to. Default: the title, when it's text. */
  id?: string
  title: ReactNode
  content: ReactNode
}

export interface AccordionProps {
  items: readonly AccordionItemData[]
  /**
   * "single": opening one closes the others (the browser's own exclusive <details>).
   * "multiple": any number open at once. Default "single".
   */
  type?: 'single' | 'multiple'
  /** Ids of items open at first */
  defaultOpen?: readonly string[]
  /** "card": separate bordered panels, as the FAQ uses (default). "plain": rows divided by lines. */
  appearance?: 'card' | 'plain'
  /** Heading level wrapping each title, for the page's outline; off by default (titles are buttons, not headings) */
  headingLevel?: 2 | 3 | 4
  className?: string
}
