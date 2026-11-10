import type { ReactNode } from 'react'

export type SortDirection = 'ascending' | 'descending'
export interface TableSort {
  key: string
  direction: SortDirection
}

export type SortValue = string | number | Date | boolean | null | undefined

export interface TableColumn<T> {
  key: string
  header: ReactNode
  /** What a cell shows. Default: the row's value at `key`. */
  cell?: (row: T) => ReactNode
  sortable?: boolean
  /** What it sorts by, when that's not the row's value at `key` (a date, a name inside an object) */
  sortValue?: (row: T) => SortValue
  /** Numbers read best lined up at the end. Default "start". */
  align?: 'start' | 'center' | 'end'
  /** A CSS width for the column: "8rem", "30%" */
  width?: string
  /** This column names the row (it's read with each cell). Default: the first column. */
  rowHeader?: boolean
  /** Leave this column out of the stacked layout on narrow screens */
  hideWhenStacked?: boolean
  /** The column's name when `header` isn't plain text (for the stacked layout and the menus) */
  label?: string
  /** With `columnMenu`, rows can be grouped by this column */
  groupable?: boolean
  /** The group a row belongs to, when that's not the row's value at `key` */
  groupValue?: (row: T) => string | null | undefined
}

export interface TableProps<T> {
  columns: TableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  /** What the table is; required, since it names the table for screen readers */
  caption: ReactNode
  /** Keep the caption for screen readers only, when a heading above already says it */
  hideCaption?: boolean
  /** Show the caption as a colored bar across the top */
  titleBar?: boolean
  /**
   * A menu on each column's header: sort up or down, sort by several columns, show and hide
   * columns, and group rows by a `groupable` column. Shift-clicking a header adds to the sort.
   */
  columnMenu?: boolean
  /** Columns to start hidden, by key */
  defaultHiddenColumns?: string[]
  /** The `groupable` column to start grouped by, by key */
  defaultGroupBy?: string
  /** Controlled sort; leave out to let it manage itself */
  sort?: TableSort | null
  defaultSort?: TableSort | null
  onSortChange?: (sort: TableSort) => void
  /** The rows come sorted already (sorted on the server); the table only shows the arrows */
  manualSort?: boolean
  /** A checkbox on each row, with "Select all" above */
  selectable?: boolean
  selected?: string[]
  defaultSelected?: string[]
  onSelectedChange?: (ids: string[]) => void
  /** Buttons shown above the table while rows are selected: Export, Delete */
  bulkActions?: (selected: string[]) => ReactNode
  /** Names a row for its checkbox ("Select Jordan Lee"). Default: the row header's text. */
  getRowLabel?: (row: T) => string
  /** A last column of actions for each row, like an ActionMenu */
  rowActions?: (row: T) => ReactNode
  /** Shown when there are no rows. Default "Nothing here yet." */
  empty?: ReactNode
  /** With no rows yet, placeholder rows; with rows, they stay and dim until it's done */
  loading?: boolean
  /** Scroll inside this height, keeping the header in view: "24rem" */
  maxHeight?: string
  density?: 'comfortable' | 'compact'
  /** Below 40rem of width, each row becomes a card of label/value lines. Default true. */
  stackOnNarrow?: boolean
  className?: string
}
