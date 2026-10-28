'use client'

import { ChevronDown, Search } from 'lucide-react'
import type { FC } from 'react'

import { cn } from '@/lib/cn'

import { Badge } from '../Badge'
import { Button } from '../Button'
import { Checkbox, CheckboxGroup, Input, Radio, RadioGroup } from '../Form'
import { useControllable } from '../Form/useControllable'
import { Popover } from '../Popover'
import type { FilterBarProps, FilterDefinition, FilterOption } from './types'

const OptionText: FC<{ option: FilterOption }> = ({ option }) => (
  <span className="flex items-baseline gap-2">
    {option.label}
    {option.count !== undefined ? <span className="text-[0.8rem] text-muted tabular-nums">{option.count}</span> : null}
  </span>
)

/**
 * One row of controls that narrow what's below it: a search box, filters that each open
 * a list to pick from, and the picks as removable chips with "Clear all".
 *
 *   <FilterBar
 *     filters={[
 *       { id: 'status', label: 'Status', options: [{ value: 'open', label: 'Open' }, { value: 'full', label: 'Full' }] },
 *       { id: 'term', label: 'Term', multiple: false, options: terms },
 *     ]}
 *     value={filters}
 *     onValueChange={setFilters}
 *     onSearchChange={setQuery}
 *     resultCount={rows.length}
 *   />
 *
 * It only holds the picks; filtering the data is up to you, so the table, charts, and
 * stats below can all use the same picks.
 */
export const FilterBar: FC<FilterBarProps> = ({
  filters,
  value,
  defaultValue = {},
  onValueChange,
  search,
  defaultSearch,
  onSearchChange,
  searchPlaceholder = 'Search',
  resultCount,
  children,
  'aria-label': ariaLabel = 'Filters',
  className,
}) => {
  const [picks, setPicks] = useControllable(value, defaultValue, onValueChange)
  const [query, setQuery] = useControllable(search, defaultSearch ?? '', onSearchChange)
  const searchable = search !== undefined || defaultSearch !== undefined || onSearchChange !== undefined

  const set = (id: string, values: string[]) => setPicks({ ...picks, [id]: values })
  const chips = filters.flatMap((f) => (picks[f.id] ?? []).map((v) => ({ f, v, label: f.options.find((o) => o.value === v)?.label ?? v })))

  const triggerText = (f: FilterDefinition) => {
    const on = picks[f.id] ?? []
    if (!on.length) return f.label
    if (f.multiple === false || on.length === 1) return `${f.label}: ${f.options.find((o) => o.value === on[0])?.label ?? on[0]}`
    return `${f.label} · ${on.length}`
  }

  return (
    <div role="search" aria-label={ariaLabel} className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {searchable ? (
          <Input
            type="search"
            size="sm"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leading={<Search size={15} aria-hidden />}
            className="max-w-xs min-w-48 flex-1"
          />
        ) : null}
        {filters.map((f) => {
          const on = picks[f.id] ?? []
          return (
            <Popover
              key={f.id}
              aria-label={`Filter by ${f.label.toLowerCase()}`}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  trailing={<ChevronDown size={14} aria-hidden />}
                  className={cn(on.length ? 'border-brand bg-brand-tint' : 'border-line text-ink-soft hover:border-brand-edge hover:bg-fill hover:text-ink')}
                >
                  {triggerText(f)}
                </Button>
              }
            >
              <div className="flex min-w-48 flex-col gap-3">
                {f.multiple === false ? (
                  <RadioGroup legend={f.label} value={on[0] ?? null} onValueChange={(v) => set(f.id, [v])}>
                    {f.options.map((o) => (
                      <Radio key={o.value} value={o.value}>
                        <OptionText option={o} />
                      </Radio>
                    ))}
                  </RadioGroup>
                ) : (
                  <CheckboxGroup legend={f.label} value={on} onValueChange={(v) => set(f.id, v)}>
                    {f.options.map((o) => (
                      <Checkbox key={o.value} value={o.value}>
                        <OptionText option={o} />
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                )}
                {on.length ? (
                  <button
                    type="button"
                    onClick={() => set(f.id, [])}
                    className="cursor-pointer self-start rounded-md text-[0.85rem] font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    Clear {f.label.toLowerCase()}
                  </button>
                ) : null}
              </div>
            </Popover>
          )
        })}
        {children}
        {resultCount !== undefined ? (
          <p aria-live="polite" className="m-0 ml-auto text-[0.85rem] text-muted tabular-nums">
            {resultCount === 1 ? '1 result' : `${resultCount.toLocaleString('en-US')} results`}
          </p>
        ) : null}
      </div>
      {chips.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map(({ f, v, label }) => (
            <Badge key={f.id + v} size="sm" tone="brand" onRemove={() => set(f.id, (picks[f.id] ?? []).filter((x) => x !== v))}>
              {`${f.label}: ${label}`}
            </Badge>
          ))}
          <button
            type="button"
            onClick={() => setPicks({})}
            className="cursor-pointer rounded-md px-1.5 text-[0.8rem] font-semibold text-ink-soft hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  )
}
