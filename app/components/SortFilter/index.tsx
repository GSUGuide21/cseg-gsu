'use client'

import { ArrowDownUp, Check, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FC } from 'react'

import { ActionMenu } from '../ActionMenu'
import { Button } from '../Button'
import { FilterBar } from '../Filter'
import type { FilterValues } from '../Filter/types'
import type { SortValue } from '../Table/types'
import type { SortFilterBarProps, UseSortFilterOptions } from './types'

const QUERY = 'q'
const SORT = 'sort'

const listOf = (value: string | readonly string[] | null | undefined) => (value == null ? [] : typeof value === 'string' ? [value] : value)
const plain = (value: SortValue) => (value instanceof Date ? value.getTime() : typeof value === 'string' ? value.toLowerCase() : value)

/** Order two values; `null` and `undefined` come out as "no value" for the caller to put last */
const compare = (a: SortValue, b: SortValue) => {
  const [x, y] = [plain(a), plain(b)]
  if (typeof x === 'string' && typeof y === 'string') return x.localeCompare(y)
  return Number(x) - Number(y)
}

/**
 * Filters, a search, and a sort over rows already in hand, ready for a SortFilterBar. It
 * does the filtering and sorting and counts each option, so a screen only says what to read
 * from a row:
 *
 *   const docs = useSortFilter({
 *     rows,
 *     search: (d) => [d.title, d.slug],
 *     filters: [{ id: 'status', label: 'Status', value: (d) => d.status }],
 *     sorts: [{ id: 'newest', label: 'Newest first', value: (d) => d.updated_at, direction: 'descending' }],
 *   })
 *   <SortFilterBar {...docs.bar} searchPlaceholder="Search posts" />
 *   {docs.rows.map(…)}
 *
 * Filters of different kinds narrow together; several picks in one filter widen it.
 */
export function useSortFilter<T>({ rows, filters = [], sorts = [], defaultSort, search, syncUrl = false }: UseSortFilterOptions<T>) {
  const [picks, setPicks] = useState<FilterValues>({})
  const [query, setQuery] = useState('')
  const firstSort = defaultSort ?? sorts[0]?.id ?? ''
  const [sort, setSort] = useState(firstSort)

  // The address, read once in the browser (the server's page can't know it); written from then on
  const loaded = useRef(!syncUrl)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const params = new URLSearchParams(window.location.search)
    const fromUrl: FilterValues = {}
    for (const f of filters) {
      const values = params.get(f.id)?.split(',').filter(Boolean)
      if (values?.length) fromUrl[f.id] = values
    }
    setPicks(fromUrl)
    setQuery(params.get(QUERY) ?? '')
    const wanted = params.get(SORT)
    if (wanted && sorts.some((s) => s.id === wanted)) setSort(wanted)
    // Only ever once: the choices are this hook's from here on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!syncUrl || !loaded.current) return
    const params = new URLSearchParams(window.location.search)
    for (const f of filters) {
      const values = picks[f.id]
      if (values?.length) params.set(f.id, values.join(','))
      else params.delete(f.id)
    }
    if (query) params.set(QUERY, query)
    else params.delete(QUERY)
    if (sort !== firstSort) params.set(SORT, sort)
    else params.delete(SORT)
    const next = params.toString()
    window.history.replaceState(window.history.state, '', next ? `${window.location.pathname}?${next}` : window.location.pathname)
  }, [syncUrl, filters, picks, query, sort, firstSort])

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase()
    const matching = rows.filter((row) => {
      for (const f of filters) {
        const on = picks[f.id]
        if (on?.length && !listOf(f.value(row)).some((v) => on.includes(v))) return false
      }
      if (!words || !search) return true
      return [search(row)].flat().some((text) => text?.toLowerCase().includes(words))
    })
    const by = sorts.find((s) => s.id === sort)
    if (!by) return matching
    const direction = by.direction === 'descending' ? -1 : 1
    return matching
      .map((row, i) => ({ row, i, value: by.value(row) }))
      .sort((a, b) => {
        const none = Number(a.value == null) - Number(b.value == null)
        return none || (a.value == null ? 0 : compare(a.value, b.value!) * direction) || a.i - b.i
      })
      .map((r) => r.row)
  }, [rows, filters, sorts, sort, picks, query, search])

  const definitions = filters.map(({ value, options, ...f }) => {
    const counts = new Map<string, number>()
    for (const row of rows) for (const v of listOf(value(row))) counts.set(v, (counts.get(v) ?? 0) + 1)
    const choices = options ?? [...counts.keys()].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }))
    return { ...f, options: choices.map((o) => ({ ...o, count: counts.get(o.value) ?? 0 })) }
  })

  return {
    rows: shown,
    /** Back to everything, with the sort left as it is */
    clear: () => {
      setPicks({})
      setQuery('')
    },
    bar: {
      filters: definitions,
      value: picks,
      onValueChange: setPicks,
      ...(search ? { search: query, onSearchChange: setQuery } : {}),
      resultCount: shown.length,
      sorts: sorts.map(({ id, label }) => ({ id, label })),
      sort,
      onSortChange: setSort,
    } satisfies SortFilterBarProps,
  }
}

/** The bar for useSortFilter: a FilterBar with a sort menu beside its filters */
export const SortFilterBar: FC<SortFilterBarProps> = ({ sorts = [], sort, onSortChange, children, ...bar }) => {
  const current = sorts.find((s) => s.id === sort)
  return (
    <FilterBar {...bar}>
      {sorts.length > 1 ? (
        <ActionMenu
          label="Sort by"
          align="start"
          trigger={
            <Button
              variant="outline"
              size="sm"
              leading={<ArrowDownUp size={14} aria-hidden />}
              trailing={<ChevronDown size={14} aria-hidden />}
              className="border-line text-ink-soft hover:border-brand-edge hover:bg-fill hover:text-ink"
            >
              {current?.label ?? 'Sort'}
            </Button>
          }
          items={sorts.map((s) => ({ label: s.label, icon: s.id === sort ? <Check aria-label="Selected" /> : <span />, onSelect: () => onSortChange?.(s.id) }))}
        />
      ) : null}
      {children}
    </FilterBar>
  )
}
