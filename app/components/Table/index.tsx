'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useId, useMemo, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Checkbox } from '../Form'
import { useControllable } from '../Form/useControllable'
import { Skeleton } from '../Skeleton'
import type { SortValue, TableColumn, TableProps, TableSort } from './types'

const value = <T,>(row: T, key: string) => (row as Record<string, unknown>)[key]

const comparable = (v: SortValue) => (v instanceof Date ? v.getTime() : typeof v === 'boolean' ? Number(v) : v)

/** Sorts a copy of `rows`; empty values go last either way */
export const sortRows = <T,>(rows: T[], column: TableColumn<T> | undefined, direction: TableSort['direction']) => {
  if (!column) return rows
  const get = column.sortValue ?? ((row: T) => value(row, column.key) as SortValue)
  const sign = direction === 'ascending' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = comparable(get(a))
    const y = comparable(get(b))
    const xEmpty = x === null || x === undefined || x === ''
    const yEmpty = y === null || y === undefined || y === ''
    if (xEmpty || yEmpty) return xEmpty === yEmpty ? 0 : xEmpty ? 1 : -1
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign
    return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * sign
  })
}

const alignClass = { start: 'text-left', center: 'text-center', end: 'text-right' }
const columnName = <T,>(c: TableColumn<T>) => c.label ?? (typeof c.header === 'string' ? c.header : c.key)

/**
 * Rows of records: sortable columns, row selection with bulk actions, row actions, and an
 * empty and a loading state. On a narrow screen each row becomes a card of label/value
 * lines (and a "Sort by" menu stands in for the column headers).
 *
 *   <Table
 *     caption="Members"
 *     rows={members}
 *     getRowId={(m) => m.id}
 *     columns={[
 *       { key: 'name', header: 'Name', sortable: true },
 *       { key: 'joined', header: 'Joined', sortable: true, sortValue: (m) => new Date(m.joined) },
 *       { key: 'events', header: 'Events', align: 'end', sortable: true },
 *     ]}
 *     selectable
 *     bulkActions={(ids) => <Button size="sm" variant="outline">Export {ids.length}</Button>}
 *     rowActions={(m) => <ActionMenu label={`Actions for ${m.name}`} items={…} />}
 *   />
 */
export function Table<T>({
  columns,
  rows,
  getRowId,
  caption,
  hideCaption = false,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  manualSort = false,
  selectable = false,
  selected: selectedProp,
  defaultSelected = [],
  onSelectedChange,
  bulkActions,
  getRowLabel,
  rowActions,
  empty = 'Nothing here yet.',
  loading = false,
  maxHeight,
  density = 'comfortable',
  stackOnNarrow = true,
  className,
}: TableProps<T>) {
  const [sort, setSort] = useControllable<TableSort | null>(sortProp, defaultSort, (s) => s && onSortChange?.(s))
  const [selected, setSelected] = useControllable(selectedProp, defaultSelected, onSelectedChange)
  const id = useId()

  const headerIndex = Math.max(0, columns.findIndex((c) => c.rowHeader))
  const sortColumn = sort ? columns.find((c) => c.key === sort.key) : undefined
  const shown = useMemo(
    () => (manualSort || !sort ? rows : sortRows(rows, sortColumn, sort.direction)),
    [rows, manualSort, sort, sortColumn]
  )
  const sortable = columns.filter((c) => c.sortable)

  const ids = shown.map(getRowId)
  const picked = new Set(selected)
  const pickedHere = ids.filter((i) => picked.has(i)).length
  const allPicked = ids.length > 0 && pickedHere === ids.length
  const labelFor = (row: T) => {
    if (getRowLabel) return getRowLabel(row)
    const v = value(row, columns[headerIndex]?.key ?? '')
    return typeof v === 'string' || typeof v === 'number' ? String(v) : getRowId(row)
  }
  const toggle = (rowId: string, on: boolean) => setSelected(on ? [...selected, rowId] : selected.filter((s) => s !== rowId))
  const toggleAll = (on: boolean) => setSelected(on ? Array.from(new Set([...selected, ...ids])) : selected.filter((s) => !ids.includes(s)))

  const sortBy = (key: string) =>
    setSort({ key, direction: sort?.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending' })

  const pad = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3'
  const colCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)
  // Stacked: rows become cards. Explicit roles keep it a table to screen readers once
  // CSS display changes take the table's own semantics away.
  const s = (classes: string) => (stackOnNarrow ? classes : '')

  const placeholders = loading && rows.length === 0
  const toolbar = selectable || (stackOnNarrow && sortable.length > 0)

  return (
    <div className={cn('@container flex min-w-0 flex-col gap-3', className)}>
      {toolbar ? (
        <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2">
          {selectable ? (
            <Checkbox
              checked={allPicked}
              indeterminate={pickedHere > 0 && !allPicked}
              onCheckedChange={toggleAll}
              disabled={ids.length === 0}
            >
              Select all
            </Checkbox>
          ) : null}
          <span aria-live="polite" className="text-[0.85rem] font-semibold text-ink-soft">
            {selectable && selected.length ? `${selected.length} selected` : ''}
          </span>
          {selectable && selected.length && bulkActions ? <div className="flex flex-wrap items-center gap-2">{bulkActions(selected)}</div> : null}
          {stackOnNarrow && sortable.length ? (
            // Narrow screens hide the column headers; this sorts instead
            <label className="ml-auto hidden items-center gap-2 text-[0.85rem] text-ink-soft @max-[40rem]:flex">
              Sort by
              <select
                value={sort ? `${sort.key}:${sort.direction}` : ''}
                onChange={(e) => {
                  const [key, direction] = e.target.value.split(':') as [string, TableSort['direction']]
                  if (key) setSort({ key, direction })
                }}
                className="h-9 cursor-pointer rounded-lg border border-line bg-surface px-2 text-[0.85rem] text-ink focus-visible:outline-2 focus-visible:outline-brand"
              >
                {!sort ? <option value="">Choose…</option> : null}
                {sortable.flatMap((c) => [
                  <option key={c.key + 'a'} value={`${c.key}:ascending`}>
                    {columnName(c)} ↑
                  </option>,
                  <option key={c.key + 'd'} value={`${c.key}:descending`}>
                    {columnName(c)} ↓
                  </option>,
                ])}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn('overflow-auto rounded-xl border border-line', s('@max-[40rem]:overflow-visible @max-[40rem]:rounded-none @max-[40rem]:border-0'))}
        style={maxHeight ? { maxHeight } : undefined}
        // A table that scrolls sideways can be scrolled from the keyboard
        tabIndex={maxHeight ? 0 : undefined}
        role={maxHeight ? 'region' : undefined}
        aria-labelledby={maxHeight ? `${id}-caption` : undefined}
      >
        <table
          role="table"
          aria-busy={loading || undefined}
          className={cn('w-full border-collapse text-[0.9rem] transition-opacity', loading && rows.length > 0 && 'opacity-55', s('@max-[40rem]:block'))}
        >
          <caption id={`${id}-caption`} className={cn('px-4 py-3 text-left font-bold text-ink', hideCaption && 'sr-only', s('@max-[40rem]:block @max-[40rem]:px-0'))}>
            {caption}
          </caption>
          <thead role="rowgroup" className={s('@max-[40rem]:hidden')}>
            <tr role="row" className="border-b border-line">
              {selectable ? (
                <th role="columnheader" scope="col" className={cn(pad, 'w-10 bg-fill', maxHeight && 'sticky top-0 z-1')}>
                  <span className="sr-only">Select</span>
                </th>
              ) : null}
              {columns.map((c) => {
                const active = sort?.key === c.key
                const Icon = !active ? ArrowUpDown : sort.direction === 'ascending' ? ArrowUp : ArrowDown
                return (
                  <th
                    key={c.key}
                    role="columnheader"
                    scope="col"
                    aria-sort={c.sortable ? (active ? sort.direction : 'none') : undefined}
                    style={c.width ? { width: c.width } : undefined}
                    className={cn(
                      pad,
                      'bg-fill text-[0.78rem] font-bold tracking-wide whitespace-nowrap text-ink-soft uppercase',
                      alignClass[c.align ?? 'start'],
                      maxHeight && 'sticky top-0 z-1'
                    )}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => sortBy(c.key)}
                        className={cn(
                          '-mx-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 font-bold tracking-wide uppercase hover:text-ink focus-visible:outline-2 focus-visible:outline-brand',
                          active && 'text-ink',
                          c.align === 'end' && 'flex-row-reverse'
                        )}
                      >
                        {c.header}
                        <Icon size={14} aria-hidden className={active ? 'text-brand' : 'opacity-50'} />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
              {rowActions ? (
                <th role="columnheader" scope="col" className={cn(pad, 'w-12 bg-fill', maxHeight && 'sticky top-0 z-1')}>
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody role="rowgroup" className={s('@max-[40rem]:flex @max-[40rem]:flex-col @max-[40rem]:gap-2')}>
            {placeholders ? (
              Array.from({ length: 5 }, (_, r) => (
                <tr key={r} role="row" className={cn('border-b border-line last:border-0', s('@max-[40rem]:block @max-[40rem]:rounded-xl @max-[40rem]:border @max-[40rem]:p-3'))}>
                  {Array.from({ length: colCount }, (_, c) => (
                    <td key={c} role="cell" className={cn(pad, s('@max-[40rem]:block @max-[40rem]:px-0 @max-[40rem]:py-1.5'))}>
                      <Skeleton shape="text" width={c === 0 && selectable ? 16 : `${60 + ((r * 7 + c * 13) % 35)}%`} />
                    </td>
                  ))}
                </tr>
              ))
            ) : shown.length === 0 ? (
              <tr role="row" className={s('@max-[40rem]:block')}>
                <td role="cell" colSpan={colCount} className={cn('px-4 py-10 text-center text-muted', s('@max-[40rem]:block @max-[40rem]:rounded-xl @max-[40rem]:border @max-[40rem]:border-line'))}>
                  {empty}
                </td>
              </tr>
            ) : (
              shown.map((row) => {
                const rowId = getRowId(row)
                const on = picked.has(rowId)
                return (
                  <tr
                    key={rowId}
                    role="row"
                    className={cn(
                      'border-b border-line transition-colors last:border-0',
                      on ? 'bg-brand-wash' : 'hover:bg-fill',
                      s('@max-[40rem]:relative @max-[40rem]:flex @max-[40rem]:flex-col @max-[40rem]:rounded-xl @max-[40rem]:border @max-[40rem]:p-3 @max-[40rem]:last:border'),
                      s(on ? '@max-[40rem]:border-brand-edge' : '')
                    )}
                  >
                    {selectable ? (
                      <td role="cell" className={cn(pad, 'w-10', s('@max-[40rem]:absolute @max-[40rem]:top-3 @max-[40rem]:right-3 @max-[40rem]:p-0'))}>
                        <Checkbox checked={on} onCheckedChange={(v) => toggle(rowId, v)} aria-label={`Select ${labelFor(row)}`} />
                      </td>
                    ) : null}
                    {columns.map((c, ci) => {
                      const content = (c.cell ? c.cell(row) : (value(row, c.key) as ReactNode)) ?? '—'
                      const header = ci === headerIndex
                      const Cell = header ? 'th' : 'td'
                      return (
                        <Cell
                          key={c.key}
                          role={header ? 'rowheader' : 'cell'}
                          scope={header ? 'row' : undefined}
                          data-label={columnName(c)}
                          className={cn(
                            pad,
                            'align-middle',
                            alignClass[c.align ?? 'start'],
                            header ? 'font-semibold text-ink' : 'text-ink-soft',
                            // Stacked: the header line is the card's title; others are label / value lines
                            s(
                              header
                                ? cn('@max-[40rem]:block @max-[40rem]:px-0 @max-[40rem]:pt-0 @max-[40rem]:pb-1.5 @max-[40rem]:text-left @max-[40rem]:text-[1rem]', selectable && '@max-[40rem]:pr-10')
                                : '@max-[40rem]:flex @max-[40rem]:justify-between @max-[40rem]:gap-4 @max-[40rem]:px-0 @max-[40rem]:py-1 @max-[40rem]:text-right @max-[40rem]:before:shrink-0 @max-[40rem]:before:text-left @max-[40rem]:before:font-semibold @max-[40rem]:before:text-muted @max-[40rem]:before:content-[attr(data-label)]'
                            ),
                            c.hideWhenStacked && s('@max-[40rem]:hidden')
                          )}
                        >
                          {content}
                        </Cell>
                      )
                    })}
                    {rowActions ? (
                      <td role="cell" className={cn(pad, 'w-12 text-right', s('@max-[40rem]:flex @max-[40rem]:w-auto @max-[40rem]:justify-end @max-[40rem]:px-0 @max-[40rem]:pt-1.5 @max-[40rem]:pb-0'))}>
                        {rowActions(row)}
                      </td>
                    ) : null}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
