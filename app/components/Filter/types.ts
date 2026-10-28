import type { ReactNode } from 'react'

export interface FilterOption {
  value: string
  label: string
  /** How many results have it, shown beside it */
  count?: number
}

export interface FilterDefinition {
  id: string
  /** The filter's name: "Status" */
  label: string
  options: FilterOption[]
  /** Pick any number (default), or just one */
  multiple?: boolean
}

/** Each filter's id → the values picked in it */
export type FilterValues = Record<string, string[]>

export interface FilterBarProps {
  filters: FilterDefinition[]
  /** Controlled picks; leave out to let it manage itself */
  value?: FilterValues
  defaultValue?: FilterValues
  onValueChange?: (value: FilterValues) => void
  /** Controlled search text. The search box shows when any of the search props is set. */
  search?: string
  defaultSearch?: string
  onSearchChange?: (search: string) => void
  searchPlaceholder?: string
  /** How many results match, said after each change: "24 results" */
  resultCount?: number
  /** More controls in the row, after the filters: a date range, a view switch */
  children?: ReactNode
  /** Names the bar. Default "Filters". */
  'aria-label'?: string
  className?: string
}
