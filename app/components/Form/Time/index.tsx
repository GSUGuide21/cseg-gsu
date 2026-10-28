'use client'

import { Clock } from 'lucide-react'
import { useId, useRef, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControl } from '../Field'
import { control, controlButton, controlInput, footerButton, panel } from '../Input/variants'
import { useControllable } from '../useControllable'
import { popoverPlacement, usePopover } from '../usePopover'
import { TimeColumn } from './Column'
import { TimeSegments } from './Segments'
import type { TimeInputProps } from './types'
import { clockFor, formatTime, fromMinutes, parseTime, toMinutes } from './utils'

/**
 * A time, in one of two styles:
 *
 * - "picker" (default): type any time ("930a", "21:15", "noon"), or open the clock button
 *   for columns of hours, minutes every `step`, and AM/PM.
 * - "segments": hour, minute, and AM/PM boxes, typed into or stepped with the arrow keys
 *   one minute at a time, for exact times like 10:07.
 *
 * Times outside `min`–`max` can't be picked.
 */
export const TimeInput: FC<TimeInputProps> = ({ type = 'picker', ...props }) =>
  type === 'segments' ? <TimeSegments {...props} /> : <TimePicker {...props} />

const TimePicker: FC<Omit<TimeInputProps, 'type'>> = ({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  min = '00:00',
  max = '23:59',
  step = 5,
  locale = 'en-US',
  name,
  placeholder,
  size = 'md',
  id,
  disabled,
  required,
  invalid,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': describedBy,
}) => {
  const [value, setValue] = useControllable(valueProp, defaultValue, onValueChange)
  const [draft, setDraft] = useState<string | null>(null)
  const [unreadable, setUnreadable] = useState(false)
  const popover = usePopover(320)
  const dialogId = useId()
  const columns = useRef<(() => void)[]>([])
  const field = useFieldControl({ id, disabled, required, invalid: invalid || unreadable || undefined, 'aria-describedby': describedBy })
  const clock = clockFor(locale)
  const allowed = (t: string) => t >= min && t <= max

  const set = (t: string | null) => {
    setValue(t)
    setDraft(null)
    setUnreadable(false)
  }

  const commit = (text: string) => {
    if (!text.trim()) return set(null)
    const t = parseTime(text)
    if (t && allowed(t)) set(t)
    else setUnreadable(true)
  }

  // The time the columns edit: the value, or (before there is one) 9:00 or the earliest allowed
  const base = toMinutes(value ?? (allowed('09:00') ? '09:00' : min))
  const hour = Math.floor(base / 60)
  const minute = base % 60
  const pm = hour >= 12
  const at = (h: number, m: number) => fromMinutes(h * 60 + m)
  const anyIn = (h: number) => Array.from({ length: 60 }, (_, m) => at(h, m)).some(allowed)

  /** Change one part; if that lands outside min–max, the nearest allowed time */
  const change = (h: number, m: number) => {
    const t = at(h, m)
    set(t < min ? min : t > max ? max : t)
  }

  const hours = (clock.twelve ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : Array.from({ length: 24 }, (_, h) => h)).map((h) => {
    const h24 = clock.twelve ? (h % 12) + (pm ? 12 : 0) : h
    return { value: h24, label: clock.twelve ? String(h) : String(h).padStart(2, '0'), disabled: !anyIn(h24) }
  })
  const minuteValues = Array.from({ length: Math.ceil(60 / Math.max(1, step)) }, (_, i) => i * step).filter((m) => m < 60)
  if (value && !minuteValues.includes(minute)) minuteValues.push(minute)
  const minutes = minuteValues
    .sort((a, b) => a - b)
    .map((m) => ({ value: m, label: String(m).padStart(2, '0'), disabled: !allowed(at(hour, m)) }))
  const periods = [
    { value: 0, label: clock.am, disabled: !Array.from({ length: 12 }, (_, h) => h).some(anyIn) },
    { value: 1, label: clock.pm, disabled: !Array.from({ length: 12 }, (_, h) => h + 12).some(anyIn) },
  ]

  const focusColumn = (i: number) => columns.current[Math.min(Math.max(i, 0), columns.current.length - 1)]?.()
  const columnProps = (i: number) => ({
    onLeave: (d: -1 | 1) => focusColumn(i + d),
    onDone: () => popover.hide(),
    register: (focus: () => void) => {
      columns.current[i] = focus
    },
  })

  const now = () => {
    const d = new Date()
    const rounded = Math.round((d.getHours() * 60 + d.getMinutes()) / step) * step
    const t = fromMinutes(Math.min(rounded, 23 * 60 + 59))
    set(t < min ? min : t > max ? max : t)
  }

  return (
    <div ref={popover.rootRef} onKeyDown={popover.onKeyDown} className={cn('relative w-full', className)}>
      <div className={control({ size, invalid: field.invalid, disabled: field.disabled, floating: field.floating, className: 'pr-1.5' })}>
        <input
          {...field.controlProps}
          type="text"
          autoComplete="off"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          value={draft ?? (value ? formatTime(value, locale) : '')}
          placeholder={placeholder ?? (field.floating ? ' ' : formatTime('09:00', locale))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => {
            if (draft !== null) commit(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft !== null) {
              e.preventDefault()
              commit(e.currentTarget.value)
            } else if (e.key === 'ArrowDown' && e.altKey) {
              e.preventDefault()
              popover.show()
              requestAnimationFrame(() => focusColumn(0))
            }
          }}
          className={controlInput}
        />
        <button
          ref={popover.triggerRef}
          type="button"
          onClick={() => {
            popover.toggle()
            requestAnimationFrame(() => focusColumn(0))
          }}
          disabled={field.disabled}
          aria-label="Choose time"
          aria-haspopup="dialog"
          aria-expanded={popover.open}
          aria-controls={popover.open ? dialogId : undefined}
          className={cn(controlButton, field.floating && 'self-center', popover.open && 'bg-brand-tint text-brand')}
        >
          <Clock size={17} aria-hidden />
        </button>
      </div>

      {popover.open ? (
        <div
          ref={popover.panelRef}
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-label="Choose time"
          className={cn(panel, 'right-0 flex flex-col gap-3 p-3', popoverPlacement(popover.above))}
        >
          <div className="flex gap-1.5">
            <TimeColumn
              label="Hour"
              options={hours}
              selected={value ? hour : null}
              onSelect={(h) => change(h, minute)}
              {...columnProps(0)}
            />
            <TimeColumn label="Min" options={minutes} selected={value ? minute : null} onSelect={(m) => change(hour, m)} {...columnProps(1)} />
            {clock.twelve ? (
              <TimeColumn
                label={`${clock.am}/${clock.pm}`}
                options={periods}
                selected={value ? (pm ? 1 : 0) : null}
                onSelect={(p) => change((hour % 12) + (p ? 12 : 0), minute)}
                {...columnProps(2)}
              />
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-1 border-t border-line pt-3">
            <button type="button" onClick={now} className={cn(footerButton, 'text-brand hover:bg-brand-tint')}>
              Now
            </button>
            <span className="flex gap-1">
              <button type="button" onClick={() => {
                  set(null)
                  popover.hide()
                }} className={cn(footerButton, 'text-ink-soft hover:bg-fill hover:text-ink')}>
                Clear
              </button>
              <button type="button" onClick={() => popover.hide()} className={cn(footerButton, 'bg-brand-solid text-white hover:bg-brand-solid-hover')}>
                Done
              </button>
            </span>
          </div>
        </div>
      ) : null}

      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
    </div>
  )
}
