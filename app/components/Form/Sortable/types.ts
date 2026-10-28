import type { HTMLAttributes, ReactNode } from 'react'

import type { Orientation } from '../types'

/** Spread onto whatever the person drags the item by (SortableHandle does this for you) */
export type SortableHandleProps = HTMLAttributes<HTMLElement> & { 'data-sortable-handle': true }

export interface SortableItemState {
  /** Where the item sits now, from 0 */
  index: number
  /** Being dragged or moved with the keyboard */
  active: boolean
  handleProps: SortableHandleProps
}

export interface SortableProps<T> {
  items?: readonly T[]
  defaultItems?: readonly T[]
  onItemsChange?: (items: T[]) => void
  /** A stable, unique key per item */
  getKey: (item: T) => string
  /** What screen readers call an item ("Workshops"). Default: its key. */
  getLabel?: (item: T) => string
  renderItem: (item: T, state: SortableItemState) => ReactNode
  /** Direction of the list. Default "vertical". */
  orientation?: Orientation
  /** Sent with the form: one hidden input per item, in order, holding its key */
  name?: string
  disabled?: boolean
  className?: string
  /** Names the list for screen readers */
  'aria-label'?: string
  'aria-labelledby'?: string
}
