import type { ReactNode } from 'react'

export interface DescriptionItem {
  term: ReactNode
  details: ReactNode
}

export interface DescriptionListProps {
  items: DescriptionItem[]
  /**
   * "columns" puts each term beside its details once there's room (32rem), and stacks
   * them when narrow; "stacked" always puts the term above. Default "columns".
   */
  layout?: 'columns' | 'stacked'
  /** Lines between the rows. Default true. */
  divided?: boolean
  className?: string
}
