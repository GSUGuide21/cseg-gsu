'use client'

import type { FC } from 'react'

import { cn } from '@/lib/cn'

import { addDays, formatLongDate, startOfWeek, toISODate } from '../utils'

/** What a day looks like, worked out by the Calendar */
export interface DayState {
  selected: boolean
  /** Inside a picked (or previewed) range, ends included */
  inRange: boolean
  rangeStart: boolean
  rangeEnd: boolean
  unavailable: boolean
}

export interface MonthGridProps {
  /** Any day in the month to show */
  month: Date
  focusedISO: string
  todayISO: string | null
  weekStartsOn: number
  locale: string
  labelId: string
  dayState: (iso: string) => DayState
  onPick: (iso: string) => void
  onHover?: (iso: string | null) => void
}

/** The band behind days in a range: full width between the ends, half width at each end */
const band = (s: DayState) =>
  !s.inRange || (s.rangeStart && s.rangeEnd)
    ? ''
    : s.rangeStart
      ? 'bg-[linear-gradient(to_right,transparent_50%,var(--color-brand-tint)_50%)]'
      : s.rangeEnd
        ? 'bg-[linear-gradient(to_left,transparent_50%,var(--color-brand-tint)_50%)]'
        : 'bg-brand-tint'

/**
 * One month as a grid of days. Days from the months either side are left blank, so each
 * month reads on its own (and two months side by side don't repeat days).
 */
export const MonthGrid: FC<MonthGridProps> = ({ month, focusedISO, todayISO, weekStartsOn, locale, labelId, dayState, onPick, onHover }) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = startOfWeek(first, weekStartsOn)
  const weeks: (Date | null)[][] = []
  for (let d = start; weeks.length < 6; ) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(d, i))
    if (week.every((x) => x.getMonth() !== month.getMonth()) && weeks.length) break
    weeks.push(week.map((x) => (x.getMonth() === month.getMonth() ? x : null)))
    d = addDays(d, 7)
  }
  const weekday = (style: 'narrow' | 'long', d: Date) => new Intl.DateTimeFormat(locale, { weekday: style }).format(d)

  return (
    <table role="grid" aria-labelledby={labelId} className="w-full border-collapse" onMouseLeave={() => onHover?.(null)}>
      <thead>
        <tr>
          {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => (
            <th key={d.getDay()} scope="col" abbr={weekday('long', d)} className="h-8 text-[0.7rem] font-semibold text-muted uppercase">
              {weekday('narrow', d)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, w) => (
          <tr key={w}>
            {week.map((d, i) => {
              if (!d) return <td key={i} className="p-0" />
              const iso = toISODate(d)
              const s = dayState(iso)
              const isToday = iso === todayISO
              return (
                <td key={iso} role="gridcell" aria-selected={s.selected} className={cn('p-0 py-0.5 text-center', band(s))}>
                  <button
                    type="button"
                    data-day={iso}
                    tabIndex={iso === focusedISO ? 0 : -1}
                    aria-label={formatLongDate(d, locale)}
                    aria-current={isToday ? 'date' : undefined}
                    aria-disabled={s.unavailable || undefined}
                    onClick={() => onPick(iso)}
                    onMouseEnter={() => onHover?.(iso)}
                    onFocus={() => onHover?.(iso)}
                    className={cn(
                      'relative mx-auto grid size-9 cursor-pointer place-items-center rounded-full text-[0.85rem] text-ink tabular-nums transition-colors',
                      'hover:bg-brand/12 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
                      s.inRange && !s.selected && 'hover:bg-brand/20',
                      s.selected && 'bg-brand-solid font-semibold text-white hover:bg-brand-solid-hover',
                      s.unavailable && 'cursor-not-allowed text-ink-faint/70 line-through decoration-ink-faint/50 hover:bg-transparent'
                    )}
                  >
                    {d.getDate()}
                    {/* Today: a dot under the number */}
                    {isToday ? (
                      <span aria-hidden className={cn('absolute bottom-1 size-1 rounded-full', s.selected ? 'bg-white' : 'bg-brand')} />
                    ) : null}
                  </button>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
