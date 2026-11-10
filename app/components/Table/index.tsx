'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Rows3, X } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { ActionMenu } from '../ActionMenu'
import type { ActionMenuEntry } from '../ActionMenu/types'
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
 *
 * With `columnMenu`, it works like a data grid: each header gets a menu to sort, to sort by
 * several columns, to show and hide columns, and to group rows by a `groupable` column.
 */
export function Table<T>({
  columns,
  rows,
  getRowId,
  caption,
  hideCaption = false,
  titleBar = false,
  columnMenu = false,
  defaultHiddenColumns = [],
  defaultGroupBy,
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

  // Sorts after the first, for rows the first leaves tied
  const [thenBy, setThenBy] = useState<TableSort[]>([])
  const [hidden, setHidden] = useState(defaultHiddenColumns)
  const [groupKey, setGroupKey] = useState<string | null>(defaultGroupBy ?? null)
  // A grouped column says the same thing as its group headings, so it steps aside unless asked
  const [groupedShown, setGroupedShown] = useState(false)
  const [collapsed, setCollapsed] = useState<string[]>([])

  const headerIndex = Math.max(0, columns.findIndex((c) => c.rowHeader))
  const sorts = useMemo(() => (sort ? [sort, ...thenBy.filter((s) => s.key !== sort.key)] : []), [sort, thenBy])
  // Sorting is stable, so sorting by the last level first leaves the first level on top
  const shown = useMemo(
    () => (manualSort || !sorts.length ? rows : sorts.reduceRight((sorted, s) => sortRows(sorted, columns.find((c) => c.key === s.key), s.direction), rows)),
    [rows, manualSort, sorts, columns]
  )
  const groupColumn = columns.find((c) => c.key === groupKey && c.groupable)
  const visible = columns.filter((c) => !hidden.includes(c.key) && (c !== groupColumn || groupedShown))
  const headerKey = (visible.find((c) => c.rowHeader) ?? visible[0])?.key

  const groups = useMemo(() => {
    if (!groupColumn) return null
    const found = new Map<string, T[]>()
    for (const row of shown) {
      const name = (groupColumn.groupValue ? groupColumn.groupValue(row) : (value(row, groupColumn.key) as SortValue))?.toString() || 'None'
      found.set(name, [...(found.get(name) ?? []), row])
    }
    const named = [...found].map(([name, members]) => ({ name, members }))
    // Sorted on that column, the groups keep the sort's order; otherwise A to Z
    return sorts.some((s) => s.key === groupColumn.key) ? named : named.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  }, [groupColumn, shown, sorts])
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

  const sortBy = (key: string) => {
    setThenBy([])
    setSort({ key, direction: sort?.key === key && sort.direction === 'ascending' ? 'descending' : 'ascending' })
  }
  /** Adds a column to the sort, or changes its direction if it's already there */
  const addSort = (key: string, direction?: TableSort['direction']) => {
    const flip = (d: TableSort['direction']) => direction ?? (d === 'ascending' ? 'descending' : 'ascending')
    if (!sort) setSort({ key, direction: direction ?? 'ascending' })
    else if (sort.key === key) setSort({ key, direction: flip(sort.direction) })
    else if (thenBy.some((s) => s.key === key)) setThenBy(thenBy.map((s) => (s.key === key ? { key, direction: flip(s.direction) } : s)))
    else setThenBy([...thenBy, { key, direction: direction ?? 'ascending' }])
  }
  const clearSort = (key: string) => {
    const left = sorts.filter((s) => s.key !== key)
    setThenBy(left.slice(1))
    setSort(left[0] ?? null)
  }

  const menuFor = (c: TableColumn<T>): ActionMenuEntry[] => {
    const inSort = sorts.some((s) => s.key === c.key)
    const others = sorts.some((s) => s.key !== c.key)
    const grouped = groupColumn === c
    const sorting: ActionMenuEntry[] = !c.sortable
      ? []
      : [
          { label: 'Sort ascending', icon: <ArrowUp />, onSelect: () => (setThenBy([]), setSort({ key: c.key, direction: 'ascending' })) },
          { label: 'Sort descending', icon: <ArrowDown />, onSelect: () => (setThenBy([]), setSort({ key: c.key, direction: 'descending' })) },
          ...(others
            ? [
                { label: inSort ? 'Then ascending' : 'Add to sort, ascending', icon: <ArrowUp />, onSelect: () => addSort(c.key, 'ascending') },
                { label: inSort ? 'Then descending' : 'Add to sort, descending', icon: <ArrowDown />, onSelect: () => addSort(c.key, 'descending') },
              ]
            : []),
          ...(inSort ? [{ label: 'Clear this sort', icon: <X />, onSelect: () => clearSort(c.key) }] : []),
          'separator',
        ]
    const grouping: ActionMenuEntry[] = [
      ...(c.groupable && !grouped ? [{ label: 'Group by this field', icon: <Rows3 />, disabled: visible.length === 1 && visible[0] === c, onSelect: () => (setGroupKey(c.key), setCollapsed([])) }] : []),
      ...(groupColumn ? [{ label: `Show ${columnName(groupColumn)} in groups`, checked: groupedShown, onSelect: () => setGroupedShown(!groupedShown) }] : []),
      ...(groupColumn ? [{ label: 'Stop grouping', icon: <X />, onSelect: () => setGroupKey(null) }] : []),
    ]
    // Grouping before the list of columns, which can run long enough to scroll
    return [
      ...sorting,
      ...(grouping.length ? ([...grouping, 'separator'] as ActionMenuEntry[]) : []),
      {
        label: 'Columns',
        items: columns
          .filter((other) => other !== groupColumn || groupedShown)
          .map((other) => {
            const off = hidden.includes(other.key)
            return {
              label: columnName(other),
              checked: !off,
              // One column always stays
              disabled: !off && visible.length === 1,
              onSelect: () => setHidden(off ? hidden.filter((k) => k !== other.key) : [...hidden, other.key]),
            }
          }),
      },
    ]
  }

  const pad = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3'
  const colCount = visible.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)
  // Stacked: rows become cards. Explicit roles keep it a table to screen readers once
  // CSS display changes take the table's own semantics away.
  const s = (classes: string) => (stackOnNarrow ? classes : '')

  const placeholders = loading && rows.length === 0
  const toolbar = selectable || (stackOnNarrow && sortable.length > 0)

  const renderRow = (row: T) => {
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
        {visible.map((c) => {
          const content = (c.cell ? c.cell(row) : (value(row, c.key) as ReactNode)) ?? '—'
          const header = c.key === headerKey
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
  }

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

      <div className={cn('overflow-hidden rounded-xl border border-line shadow-card', s('@max-[40rem]:overflow-visible @max-[40rem]:rounded-none @max-[40rem]:border-0 @max-[40rem]:shadow-none'))}>
      {titleBar ? (
        // The caption below names the table for screen readers; this is the same words to look at
        <div aria-hidden className={cn('bg-linear-to-r from-brand-solid to-brand-bright px-4 py-3 text-[1.05rem] font-bold text-white', s('@max-[40rem]:mb-2 @max-[40rem]:rounded-xl'))}>
          {caption}
        </div>
      ) : null}
      <div
        className={cn('overflow-auto', s('@max-[40rem]:overflow-visible'))}
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
          <caption id={`${id}-caption`} className={cn('px-4 py-3 text-left font-bold text-ink', (hideCaption || titleBar) && 'sr-only', s('@max-[40rem]:block @max-[40rem]:px-0'))}>
            {caption}
          </caption>
          <thead role="rowgroup" className={s('@max-[40rem]:hidden')}>
            <tr role="row" className="border-b border-line">
              {selectable ? (
                <th role="columnheader" scope="col" className={cn(pad, 'w-10 bg-fill', maxHeight && 'sticky top-0 z-1')}>
                  <span className="sr-only">Select</span>
                </th>
              ) : null}
              {visible.map((c) => {
                const position = sorts.findIndex((s) => s.key === c.key)
                const active = position >= 0
                const direction = sorts[position]?.direction
                const Icon = !active ? ArrowUpDown : direction === 'ascending' ? ArrowUp : ArrowDown
                return (
                  <th
                    key={c.key}
                    role="columnheader"
                    scope="col"
                    aria-sort={c.sortable ? (active ? direction : 'none') : undefined}
                    style={c.width ? { width: c.width } : undefined}
                    className={cn(
                      pad,
                      'group/column bg-fill text-[0.78rem] font-bold tracking-wide whitespace-nowrap text-ink-soft uppercase',
                      alignClass[c.align ?? 'start'],
                      columnMenu && 'relative',
                      maxHeight && 'sticky top-0 z-1'
                    )}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={(e) => (columnMenu && e.shiftKey ? addSort(c.key) : sortBy(c.key))}
                        className={cn(
                          '-mx-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 font-bold tracking-wide uppercase hover:text-ink focus-visible:outline-2 focus-visible:outline-brand',
                          active && 'text-ink',
                          c.align === 'end' && 'flex-row-reverse'
                        )}
                      >
                        {c.header}
                        <Icon size={14} aria-hidden className={active ? 'text-brand' : 'opacity-50'} />
                        {active && sorts.length > 1 ? <span className="text-[0.7rem] text-brand tabular-nums">{position + 1}</span> : null}
                      </button>
                    ) : (
                      c.header
                    )}
                    {columnMenu ? (
                      // Over the header's edge, so a column is no wider for having a menu. No transform here: it
                      // would trap the menu, which is placed against the window, inside the scrolling table
                      <span className="absolute inset-y-0 right-0.5 flex items-center">
                        <ActionMenu
                          label={`Options for ${columnName(c)}`}
                          items={menuFor(c)}
                          trigger={
                            // Shows on hover or focus; always there where there's no hover to find it with
                            <button
                              type="button"
                              aria-label={`Options for ${columnName(c)}`}
                              className="grid size-6 cursor-pointer place-items-center rounded-md text-ink-soft opacity-0 transition-opacity group-hover/column:opacity-100 hover:bg-brand-tint hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-brand aria-expanded:opacity-100 [@media(hover:none)]:opacity-100"
                            >
                              <ChevronDown size={14} aria-hidden />
                            </button>
                          }
                        />
                      </span>
                    ) : null}
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
            ) : groups ? (
              groups.flatMap(({ name, members }) => {
                const closed = collapsed.includes(name)
                return [
                  <tr key={`group-${name}`} role="row" className={cn('border-b border-line bg-brand-wash', s('@max-[40rem]:block @max-[40rem]:rounded-xl @max-[40rem]:border'))}>
                    <th role="rowheader" scope="rowgroup" colSpan={colCount} className={cn('text-left', s('@max-[40rem]:block'))}>
                      <button
                        type="button"
                        aria-expanded={!closed}
                        onClick={() => setCollapsed(closed ? collapsed.filter((g) => g !== name) : [...collapsed, name])}
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-[0.85rem] font-bold text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                      >
                        {closed ? <ChevronRight size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
                        {name}
                        <span className="font-normal text-muted tabular-nums">{members.length}</span>
                      </button>
                    </th>
                  </tr>,
                  ...(closed ? [] : members.map(renderRow)),
                ]
              })
            ) : (
              shown.map(renderRow)
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  )
}
