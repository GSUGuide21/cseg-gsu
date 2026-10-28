'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState, type FC } from 'react'

import { Button } from '@/components'
import { Checkbox, TimeInput } from '@/components/Form'
import { cn } from '@/lib/cn'
import { getOpenStatus } from '@/lib/hours'
import type { HoursRangeJson } from '@/lib/supabase/types'

/**
 * Weekly hours as rows of days and times, for an eatery's "Open now" badge. A row that
 * closes earlier than it opens runs past midnight; "All day" is open around the clock.
 * Sent with the form as JSON in a hidden input; no rows sends null (hours not known).
 */

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Monday first, as people read a week */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

type Row = { key: number; days: number[]; open: string; close: string; allDay: boolean }

let nextKey = 0
const toRows = (schedule: readonly HoursRangeJson[] | null | undefined): Row[] =>
  (schedule ?? []).map((r) => {
    const allDay = r.open === '00:00' && r.close === '24:00'
    // The time picker has no 24:00; midnight is the same close
    return { key: nextKey++, days: [...r.days], open: r.open, close: r.close === '24:00' ? '00:00' : r.close, allDay }
  })

const toJson = (rows: Row[]): HoursRangeJson[] | null =>
  rows.length ? rows.filter((r) => r.days.length).map((r) => ({ days: [...r.days].sort(), open: r.allDay ? '00:00' : r.open, close: r.allDay ? '24:00' : r.close })) : null

export const HoursEditor: FC<{
  /** Sent with the form under this name */
  name?: string
  initial?: readonly HoursRangeJson[] | null
  /** For a hours editor inside another one's list: told each change instead of a form field */
  onChange?: (schedule: HoursRangeJson[] | null) => void
  label?: string
}> = ({ name, initial, onChange, label = 'Hours' }) => {
  const [rows, setRows] = useState<Row[]>(() => toRows(initial))
  const json = toJson(rows)
  const set = (next: Row[]) => {
    setRows(next)
    onChange?.(toJson(next))
  }
  const update = (key: number, patch: Partial<Row>) => set(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const status = json?.length ? getOpenStatus(json).label : null

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-1 text-[0.85rem] font-semibold text-ink">{label}</legend>
      {name ? <input type="hidden" name={name} value={json ? JSON.stringify(json) : ''} /> : null}
      {rows.map((r) => (
        <div key={r.key} className="flex flex-col gap-2 rounded-lg border border-line p-3">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Days">
            {DAY_ORDER.map((d) => {
              const on = r.days.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update(r.key, { days: on ? r.days.filter((x) => x !== d) : [...r.days, d] })}
                  className={cn(
                    'cursor-pointer rounded-full border px-2.5 py-1 text-[0.78rem] font-semibold transition-colors',
                    on ? 'border-brand-solid bg-brand-solid text-white' : 'border-line text-ink-soft hover:border-brand/50'
                  )}
                >
                  {DAYS[d]}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {r.allDay ? null : (
              <>
                <TimeInput size="sm" aria-label="Opens" value={r.open} onValueChange={(v) => v && update(r.key, { open: v })} step={15} />
                <span className="text-[0.85rem] text-muted">to</span>
                <TimeInput size="sm" aria-label="Closes" value={r.close} onValueChange={(v) => v && update(r.key, { close: v })} step={15} />
              </>
            )}
            <Checkbox checked={r.allDay} onCheckedChange={(allDay) => update(r.key, { allDay })}>
              All day
            </Checkbox>
            <Button size="sm" variant="ghost" className="ml-auto" leading={<Trash2 size={14} aria-hidden />} onClick={() => set(rows.filter((x) => x.key !== r.key))}>
              Remove
            </Button>
          </div>
          {!r.days.length ? <p className="text-[0.8rem] text-danger">Pick at least one day, or remove this row.</p> : null}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" leading={<Plus size={14} aria-hidden />} onClick={() => set([...rows, { key: nextKey++, days: [1, 2, 3, 4, 5], open: '09:00', close: '17:00', allDay: false }])}>
          Add hours
        </Button>
        <span className="text-[0.8rem] text-muted">
          {status ? `Right now it shows: ${status}` : 'No hours: no “Open now” badge. Leave them off when no official source gives them.'}
        </span>
      </div>
    </fieldset>
  )
}
