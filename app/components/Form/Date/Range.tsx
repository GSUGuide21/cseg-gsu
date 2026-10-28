'use client'

import { CalendarRange } from 'lucide-react'
import { useId, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControl } from '../Field'
import { control, controlButton, controlInput, footerButton, panel } from '../Input/variants'
import { useControllable } from '../useControllable'
import { useMediaQuery } from '../useMediaQuery'
import { popoverPlacement, usePopover } from '../usePopover'
import { Calendar } from './Calendar'
import type { DateRangePickerProps } from './types'
import { useTypedDate } from './useTypedDate'
import { RANGE_PRESETS, datePattern, formatRange, inRange, rangeLength, toISODate, type DateRange } from './utils'

/**
 * A span of days: type the start and end, or open the two-month calendar and click the
 * first day, then the last (a preview follows the pointer), or choose a quick pick like
 * "Next 7 days". The value is only reported once both ends are set.
 *
 *   <Field label="Trip dates"><DateRangePicker name="trip" min={today()} /></Field>
 */
export const DateRangePicker: FC<DateRangePickerProps> = ({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  min,
  max,
  isDateDisabled,
  weekStartsOn = 0,
  locale = 'en-US',
  presets = true,
  name,
  size = 'md',
  id,
  disabled,
  required,
  invalid,
  className,
  'aria-describedby': describedBy,
}) => {
  const [value, setValue] = useControllable(valueProp, defaultValue, onValueChange)
  // What's picked in the calendar so far; becomes the value once both ends are set
  const [draft, setDraft] = useState<DateRange | null>(null)
  // The two boxes while only one is filled; once both are, `value` holds them
  const [parts, setParts] = useState<DateRange>({ start: null, end: null })
  const boxes: DateRange = value ?? parts
  const allowed = (iso: string) => inRange(iso, min, max) && !isDateDisabled?.(iso)
  const startText = useTypedDate(boxes.start, locale, allowed)
  const endText = useTypedDate(boxes.end, locale, allowed)
  const popover = usePopover(460)
  // Two months side by side where there's room; one on phones, so the panel fits the screen
  const wide = useMediaQuery('(min-width: 40rem)')
  const dialogId = useId()
  const endLabelId = useId()
  const field = useFieldControl({
    id,
    disabled,
    required,
    invalid: invalid || startText.unreadable || endText.unreadable || undefined,
    'aria-describedby': describedBy,
  })

  /** Set both ends (in order), or clear */
  const apply = (start: string | null, end: string | null) => {
    startText.reset()
    endText.reset()
    setDraft(null)
    setParts({ start: null, end: null })
    if (start && end) setValue(start <= end ? { start, end } : { start: end, end: start })
    else setValue(null)
  }

  /** A typed end only counts once the other end is known too */
  const commitTyped = (which: 'start' | 'end', text: string) =>
    (which === 'start' ? startText : endText).commit(text, (iso) => {
      const next = { ...boxes, [which]: iso }
      if (next.start && next.end) apply(next.start, next.end)
      else {
        setParts(next)
        setValue(null)
      }
    })

  const shown = draft ?? value ?? null
  const summary =
    draft && draft.start && !draft.end
      ? 'Now pick the last day'
      : shown?.start && shown.end
        ? `${formatRange(shown.start, shown.end, locale)} · ${rangeLength(shown.start, shown.end)} days`
        : 'Pick the first day'

  const input = (which: 'start' | 'end') => {
    const text = which === 'start' ? startText : endText
    return (
      <input
        {...field.controlProps}
        id={which === 'start' ? field.controlProps.id : `${field.controlProps.id}-end`}
        // The Field's label names the start box; the end box adds "end date"
        aria-labelledby={which === 'end' && field.labelId ? `${field.labelId} ${endLabelId}` : undefined}
        aria-label={which === 'end' && !field.labelId ? 'End date' : !field.labelId ? 'Start date' : undefined}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text.text}
        placeholder={datePattern(locale)}
        onChange={(e) => text.type(e.target.value)}
        onBlur={(e) => {
          if (text.typing) commitTyped(which, e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && text.typing) {
            e.preventDefault()
            commitTyped(which, e.currentTarget.value)
          } else if (e.key === 'ArrowDown' && e.altKey) {
            e.preventDefault()
            popover.show()
          }
        }}
        className={cn(controlInput, 'min-w-[6.5rem] text-center first:text-left')}
      />
    )
  }

  return (
    <div ref={popover.rootRef} onKeyDown={popover.onKeyDown} className={cn('relative w-full', className)}>
      <div className={control({ size, invalid: field.invalid, disabled: field.disabled, className: 'pr-1.5' })}>
        {input('start')}
        <span aria-hidden className="shrink-0 text-ink-faint">
          –
        </span>
        {input('end')}
        <span id={endLabelId} hidden>
          end date
        </span>
        <button
          ref={popover.triggerRef}
          type="button"
          onClick={() => {
            setDraft(null)
            popover.toggle()
          }}
          disabled={field.disabled}
          aria-label="Choose dates"
          aria-haspopup="dialog"
          aria-expanded={popover.open}
          aria-controls={popover.open ? dialogId : undefined}
          className={cn(controlButton, popover.open && 'bg-brand-tint text-brand')}
        >
          <CalendarRange size={17} aria-hidden />
        </button>
      </div>

      {popover.open ? (
        <div
          ref={popover.panelRef}
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-label="Choose dates"
          className={cn(panel, 'right-0 flex max-w-[calc(100vw-2rem)] flex-col gap-4 p-4 sm:flex-row', popoverPlacement(popover.above))}
        >
          {presets ? (
            <div role="group" aria-label="Quick picks" className="flex shrink-0 flex-wrap gap-1 sm:w-32 sm:flex-col sm:border-r sm:border-line sm:pr-3">
              {RANGE_PRESETS.map((p) => {
                const [a, b] = p.get(new Date(), weekStartsOn).map(toISODate)
                const on = value?.start === a && value?.end === b
                return (
                  <button
                    key={p.label}
                    type="button"
                    disabled={!allowed(a) || !allowed(b)}
                    aria-pressed={on}
                    onClick={() => {
                      apply(a, b)
                      popover.hide()
                    }}
                    className={cn(
                      footerButton,
                      'text-left text-ink-soft hover:bg-brand-tint hover:text-brand',
                      on && 'bg-brand-tint text-brand'
                    )}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="flex min-w-0 flex-col gap-3">
            <Calendar
              mode="range"
              months={wide ? 2 : 1}
              range={shown}
              onRangeChange={(r) => {
                if (r.start && r.end) {
                  apply(r.start, r.end)
                  popover.hide()
                } else setDraft(r)
              }}
              min={min}
              max={max}
              isDateDisabled={isDateDisabled}
              weekStartsOn={weekStartsOn}
              locale={locale}
              autoFocus
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <p className="m-0 text-[0.8rem] font-semibold text-ink-soft" aria-live="polite">
                {summary}
              </p>
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    apply(null, null)
                    popover.hide()
                  }}
                  className={cn(footerButton, 'text-ink-soft hover:bg-fill hover:text-ink')}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // A lone first day is taken as a one-day range
                    if (draft?.start && !draft.end) apply(draft.start, draft.start)
                    popover.hide()
                  }}
                  className={cn(footerButton, 'bg-brand-solid text-white hover:bg-brand-solid-hover')}
                >
                  Done
                </button>
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {name ? (
        <>
          <input type="hidden" name={name} value={value?.start ?? ''} />
          <input type="hidden" name={name} value={value?.end ?? ''} />
        </>
      ) : null}
    </div>
  )
}

