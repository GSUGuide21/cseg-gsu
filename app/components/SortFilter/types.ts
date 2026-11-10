import type { FilterBarProps, FilterDefinition, FilterOption } from '../Filter/types'
import type { SortDirection, SortValue } from '../Table/types'

/** One thing to filter by, and how to read it from a row */
export interface SortFilterField<T> extends Omit<FilterDefinition, 'options'> {
  /** The row's value or values: "draft", or ["Biology", "Nursing"] */
  value: (row: T) => string | readonly string[] | null | undefined
  /** The choices, in order. Leave out to list the values the rows have, A to Z. Counts are added either way. */
  options?: readonly Omit<FilterOption, 'count'>[]
}

/** One way to order the rows */
export interface SortOption<T> {
  id: string
  /** Said in the menu and on its button: "Newest first" */
  label: string
  value: (row: T) => SortValue
  /** Default "ascending". Rows with no value go last either way. */
  direction?: SortDirection
}

export interface UseSortFilterOptions<T> {
  rows: readonly T[]
  filters?: readonly SortFilterField<T>[]
  sorts?: readonly SortOption<T>[]
  /** The sort's id to start with. Default the first. */
  defaultSort?: string
  /** What the search box looks through. Leave out for no search box. */
  search?: (row: T) => string | readonly (string | null | undefined)[]
  /** Keep the choices in the address, so reloading keeps them and a link can share them */
  syncUrl?: boolean
}

export interface SortFilterBarProps extends Pick<FilterBarProps, 'filters' | 'value' | 'onValueChange' | 'search' | 'onSearchChange' | 'searchPlaceholder' | 'resultCount' | 'children' | 'aria-label' | 'className'> {
  sorts?: readonly Pick<SortOption<never>, 'id' | 'label'>[]
  /** The sort's id */
  sort?: string
  onSortChange?: (id: string) => void
}
