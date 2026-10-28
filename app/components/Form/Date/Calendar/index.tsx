'use client'

import { useEffect, useId, useRef, useState, type FC, type KeyboardEvent } from 'react'

import { cn } from '@/lib/cn'

import { CalendarControls } from '../Controls'
import { addDays, addMonths, fromISODate, inRange, monthsBetween, startOfMonth, startOfWeek, toISODate, today } from '../utils'
import { MonthGrid, type DayState } from './Month'
import { PeriodGrid } from './Picker'
import type { CalendarProps, CalendarView } from './types'

const YEARS_SHOWN = 12

/**
 * A calendar for picking a day, or a range of days (`mode="range"`: first click starts it,
 * second ends it, with a preview between). Only one day is in the tab order; from there,
 * arrows move by day or week, Page Up/Down by month (with Shift, by year), Home/End to
 * the week's ends, and Enter or Space picks. The title zooms out to months, then years.
 */
export const Calendar: FC<CalendarProps> = (props) => {
  const { min, max, isDateDisabled, weekStartsOn = 0, locale = 'en-US', months = 1, autoFocus = false, className } = props
  const value = props.mode === 'range' ? null : (props.value ?? null)
  const range = props.mode === 'range' ? (props.range ?? null) : null

  const titleId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  // Focus follows `focused` only after a key (or a zoom) moves it, so clicks don't steal focus
  const moved = useRef(autoFocus)
  // Marked after mount: the server's "today" (its time zone) can differ from the visitor's
  const [todayISO, setTodayISO] = useState<string | null>(null)
  useEffect(() => setTodayISO(today()), [])

  const [focused, setFocused] = useState(() => {
    const now = today()
    return fromISODate(value ?? range?.start ?? (min && now < min ? min : max && now > max ? max : now))!
  })
  // The first month on screen
  const [anchor, setAnchor] = useState(() => startOfMonth(focused))
  const [view, setView] = useState<CalendarView>('days')
  // The day under the pointer (or focus), for previewing a range before its end is picked
  const [hovered, setHovered] = useState<string | null>(null)

  const focusedISO = toISODate(focused)

  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    rootRef.current?.querySelector<HTMLButtonElement>(view === 'days' ? `[data-day="${focusedISO}"]` : '[aria-current="true"]')?.focus()
  }, [focusedISO, view])

  /** Move focus to a day, bringing its month into view */
  const go = (d: Date) => {
    moved.current = true
    setFocused(d)
    if (d < anchor) setAnchor(startOfMonth(d))
    else if (monthsBetween(anchor, d) >= months) setAnchor(startOfMonth(addMonths(d, -(months - 1))))
  }

  const unavailable = (iso: string) => !inRange(iso, min, max) || !!isDateDisabled?.(iso)

  const dayState = (iso: string): DayState => {
    if (props.mode !== 'range') {
      return { selected: iso === value, inRange: false, rangeStart: false, rangeEnd: false, unavailable: unavailable(iso) }
    }
    const start = range?.start ?? null
    const end = range?.end ?? (start && hovered ? hovered : null)
    const [lo, hi] = start && end ? [start, end].sort() : [start, start]
    return {
      selected: iso === range?.start || iso === range?.end,
      inRange: !!lo && !!hi && iso >= lo && iso <= hi,
      rangeStart: iso === lo,
      rangeEnd: iso === hi,
      unavailable: unavailable(iso),
    }
  }

  const pick = (iso: string) => {
    setFocused(fromISODate(iso)!)
    if (unavailable(iso)) return
    if (props.mode !== 'range') return props.onValueChange?.(iso)
    if (!range?.start || range.end) props.onRangeChange?.({ start: iso, end: null })
    else {
      const [start, end] = [range.start, iso].sort()
      props.onRangeChange?.({ start, end })
      setHovered(null)
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const next: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
      Home: () => startOfWeek(focused, weekStartsOn),
      End: () => addDays(startOfWeek(focused, weekStartsOn), 6),
    }
    if (!next[e.key]) return
    e.preventDefault()
    go(next[e.key]())
  }

  // Header: what's showing and what the arrows step by
  const minDate = fromISODate(min)
  const maxDate = fromISODate(max)
  const year = anchor.getFullYear()
  const firstYear = Math.floor(year / YEARS_SHOWN) * YEARS_SHOWN
  const lastShown = addMonths(anchor, months - 1)
  const monthName = (d: Date) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d)
  const header = {
    days: {
      // Side by side, each month has its own title, so the header can be short ("Oct – Nov 2026")
      label: months === 1 ? monthName(anchor) : new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).formatRange(anchor, lastShown),
      unit: 'month',
      step: 1,
      previousDisabled: !!minDate && anchor <= startOfMonth(minDate),
      nextDisabled: !!maxDate && lastShown >= startOfMonth(maxDate),
    },
    months: {
      label: String(year),
      unit: 'year',
      step: 12,
      previousDisabled: !!minDate && year <= minDate.getFullYear(),
      nextDisabled: !!maxDate && year >= maxDate.getFullYear(),
    },
    years: {
      label: `${firstYear} – ${firstYear + YEARS_SHOWN - 1}`,
      unit: `${YEARS_SHOWN} years`,
      step: 12 * YEARS_SHOWN,
      previousDisabled: !!minDate && firstYear <= minDate.getFullYear(),
      nextDisabled: !!maxDate && firstYear + YEARS_SHOWN - 1 >= maxDate.getFullYear(),
    },
  }[view]

  const shift = (by: number) => {
    setAnchor(startOfMonth(addMonths(anchor, by)))
    setFocused(addMonths(focused, by))
  }

  /** Zoom back in to a month (from the months view) or a year (from the years view) */
  const zoomTo = (d: Date, nextView: CalendarView) => {
    moved.current = true
    setAnchor(startOfMonth(d))
    setFocused(addMonths(focused, monthsBetween(focused, d)))
    setView(nextView)
  }

  return (
    <div ref={rootRef} className={cn('flex w-fit max-w-full flex-col gap-3', className)}>
      <CalendarControls
        label={header.label}
        labelId={titleId}
        unit={header.unit}
        onPrevious={() => shift(-header.step)}
        onNext={() => shift(header.step)}
        previousDisabled={header.previousDisabled}
        nextDisabled={header.nextDisabled}
        onZoomOut={view === 'years' ? undefined : () => setView(view === 'days' ? 'months' : 'years')}
      />

      {view === 'days' ? (
        <div className="flex flex-wrap gap-x-6 gap-y-4" onKeyDown={onKeyDown}>
          {Array.from({ length: months }, (_, i) => {
            const month = addMonths(anchor, i)
            const gridLabel = `${titleId}-m${i}`
            return (
              <div key={i} className="flex w-70 flex-col gap-1">
                {/* Side by side, each month names itself; alone, the header does */}
                <span id={gridLabel} className={cn('text-center text-[0.8rem] font-semibold text-ink-soft', months === 1 && 'sr-only')}>
                  {monthName(month)}
                </span>
                <MonthGrid
                  month={month}
                  focusedISO={focusedISO}
                  todayISO={todayISO}
                  weekStartsOn={weekStartsOn}
                  locale={locale}
                  labelId={gridLabel}
                  dayState={dayState}
                  onPick={pick}
                  onHover={props.mode === 'range' ? setHovered : undefined}
                />
              </div>
            )
          })}
        </div>
      ) : view === 'months' ? (
        <div className="w-70">
          <PeriodGrid
            label={`Months of ${year}`}
            items={Array.from({ length: 12 }, (_, m) => ({
              key: m,
              label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, m, 1)),
              current: m === anchor.getMonth(),
              disabled: (!!minDate && new Date(year, m + 1, 0) < minDate) || (!!maxDate && new Date(year, m, 1) > maxDate),
            }))}
            onPick={(m) => zoomTo(new Date(year, m, 1), 'days')}
          />
        </div>
      ) : (
        <div className="w-70">
          <PeriodGrid
            label="Years"
            items={Array.from({ length: YEARS_SHOWN }, (_, i) => firstYear + i).map((y) => ({
              key: y,
              label: String(y),
              current: y === year,
              disabled: (!!minDate && y < minDate.getFullYear()) || (!!maxDate && y > maxDate.getFullYear()),
            }))}
            onPick={(y) => zoomTo(new Date(y, anchor.getMonth(), 1), 'months')}
          />
        </div>
      )}
    </div>
  )
}

