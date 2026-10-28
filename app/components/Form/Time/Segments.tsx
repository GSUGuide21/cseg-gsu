'use client'

import { Clock } from 'lucide-react'
import { useId, useRef, useState, type FC, type KeyboardEvent } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControl } from '../Field'
import { control, controlIcon } from '../Input/variants'
import { useControllable } from '../useControllable'
import type { TimeInputProps } from './types'
import { clockFor, fromMinutes, toMinutes } from './utils'

/** The three boxes; `hour` is as shown (1–12 or 0–23), `pm` only matters on a 12-hour clock */
type Parts = { hour: number | null; minute: number | null; pm: boolean | null }
type Segment = 'hour' | 'minute' | 'period'

const EMPTY: Parts = { hour: null, minute: null, pm: null }

/** Typed digits run together into one box for this long */
const TYPING_MS = 1000

const pad = (n: number) => String(n).padStart(2, '0')

const toParts = (t: string, twelve: boolean): Parts => {
  const h = Math.floor(toMinutes(t) / 60)
  const m = toMinutes(t) % 60
  return twelve ? { hour: h % 12 || 12, minute: m, pm: h >= 12 } : { hour: h, minute: m, pm: null }
}

/** "HH:mm" once every box is filled, else null */
const fromParts = ({ hour, minute, pm }: Parts, twelve: boolean) => {
  if (hour === null || minute === null || (twelve && pm === null)) return null
  return fromMinutes((twelve ? (hour % 12) + (pm ? 12 : 0) : hour) * 60 + minute)
}

/**
 * A time as hour, minute, and AM/PM boxes, like the time fields on phones and desktops.
 * Any minute can be set. In each box: arrows step by one (Shift+arrow or Page Up/Down by
 * `step` minutes), typing digits fills it and moves on, A/P sets the period, Backspace
 * clears, and Left/Right move between boxes. The value is reported once every box is filled.
 */
export const TimeSegments: FC<Omit<TimeInputProps, 'type'>> = ({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  min = '00:00',
  max = '23:59',
  step = 15,
  locale = 'en-US',
  name,
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
  const clock = clockFor(locale)
  const [value, setValue] = useControllable(valueProp, defaultValue, onValueChange)
  // The boxes while some are empty (or the time is out of range); otherwise `value` holds them
  const [partial, setPartial] = useState<Parts>(() => (defaultValue ? toParts(defaultValue, clock.twelve) : EMPTY))
  const parts = value ? toParts(value, clock.twelve) : partial
  const typed = useRef({ segment: null as Segment | null, text: '', at: 0 })
  const refs = useRef<Partial<Record<Segment, HTMLSpanElement | null>>>({})
  const labels = useId()

  const whole = fromParts(parts, clock.twelve)
  const outOfRange = !!whole && (whole < min || whole > max)
  const field = useFieldControl({ id, disabled, required, invalid: invalid || outOfRange || undefined, 'aria-describedby': describedBy })
  const order: Segment[] = clock.twelve ? ['hour', 'minute', 'period'] : ['hour', 'minute']

  const update = (next: Parts) => {
    setPartial(next)
    const t = fromParts(next, clock.twelve)
    // Only an allowed, complete time is reported; an out-of-range one stays, marked invalid
    setValue(t && t >= min && t <= max ? t : null)
  }

  const focus = (s: Segment | undefined) => s && refs.current[s]?.focus()
  const move = (from: Segment, by: 1 | -1) => focus(order[order.indexOf(from) + by])

  const [hourLo, hourHi] = clock.twelve ? [1, 12] : [0, 23]
  const wrap = (n: number, lo: number, hi: number) => ((((n - lo) % (hi - lo + 1)) + (hi - lo + 1)) % (hi - lo + 1)) + lo

  /** Digits typed in quick succession build one number; a box that can't take another digit moves on */
  const typeDigit = (s: 'hour' | 'minute', digit: number) => {
    const now = Date.now()
    const t = typed.current
    const hi = s === 'hour' ? hourHi : 59
    let text = t.segment === s && now - t.at < TYPING_MS && t.text.length < 2 ? t.text + digit : String(digit)
    // A second digit that overshoots ("1", "5" in 12-hour hours) starts over with it
    if (Number(text) > hi) text = String(digit)
    const n = Number(text)
    // "1" could still become 10–12 (or 1x on a 24-hour clock); "3" in hours, or "7" in minutes, can't grow
    const done = text.length === 2 || n * 10 > hi
    typed.current = done ? { segment: null, text: '', at: 0 } : { segment: s, text, at: now }
    if (s === 'hour') {
      if (n < hourLo && done) return
      update({ ...parts, hour: n < hourLo ? parts.hour : n })
    } else update({ ...parts, minute: n })
    if (done) move(s, 1)
  }

  const onKeyDown = (s: Segment) => (e: KeyboardEvent) => {
    if (disabled) return
    const big = e.shiftKey || e.key === 'PageUp' || e.key === 'PageDown'
    const up = e.key === 'ArrowUp' || e.key === 'PageUp'
    const down = e.key === 'ArrowDown' || e.key === 'PageDown'

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      return move(s, e.key === 'ArrowRight' ? 1 : -1)
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      typed.current = { segment: null, text: '', at: 0 }
      return update({ ...parts, [s === 'period' ? 'pm' : s]: null })
    }
    if (s === 'period') {
      const key = e.key.toLowerCase()
      if (up || down) update({ ...parts, pm: !(parts.pm ?? false) })
      else if (key === clock.am[0].toLowerCase() || key === 'a') update({ ...parts, pm: false })
      else if (key === clock.pm[0].toLowerCase() || key === 'p') update({ ...parts, pm: true })
      else return
      return e.preventDefault()
    }
    if (up || down) {
      e.preventDefault()
      const by = up ? 1 : -1
      if (s === 'hour') {
        update({ ...parts, hour: parts.hour === null ? (up ? hourLo : hourHi) : wrap(parts.hour + by, hourLo, hourHi) })
      } else {
        const m = parts.minute
        // Shift/Page jumps land on the step ("10:07" + 15 → "10:15"), as a clock's ticks do
        const next = m === null ? (up ? 0 : 60 - (big ? step : 1)) : big ? (up ? Math.floor(m / step) * step + step : Math.ceil(m / step) * step - step) : m + by
        update({ ...parts, minute: wrap(next, 0, 59) })
      }
      return
    }
    if (/^\d$/.test(e.key)) {
      e.preventDefault()
      typeDigit(s, Number(e.key))
    }
  }

  const segment = (s: Segment, text: string | null, placeholder: string, now: number | null, lo: number, hi: number, valuetext: string | undefined, name: string) => (
    <span
      ref={(el) => {
        refs.current[s] = el
      }}
      role="spinbutton"
      tabIndex={field.disabled ? -1 : 0}
      aria-labelledby={`${field.labelId ?? ''} ${labels}-${s}`.trim()}
      aria-valuemin={lo}
      aria-valuemax={hi}
      aria-valuenow={now ?? undefined}
      aria-valuetext={valuetext ?? (now === null ? 'Empty' : undefined)}
      aria-disabled={field.disabled || undefined}
      aria-invalid={field.invalid || undefined}
      aria-describedby={s === 'hour' ? field.controlProps['aria-describedby'] : undefined}
      onKeyDown={onKeyDown(s)}
      onBlur={() => {
        typed.current = { segment: null, text: '', at: 0 }
      }}
      className={cn(
        'rounded px-0.5 tabular-nums outline-none caret-transparent select-none',
        'focus:bg-brand-solid focus:text-white',
        text === null && 'text-ink-faint'
      )}
    >
      <span id={`${labels}-${s}`} hidden>
        {name}
      </span>
      {text ?? placeholder}
    </span>
  )

  return (
    <div
      role="group"
      id={field.controlProps.id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? (ariaLabel ? undefined : field.labelId)}
      // Clicking the box (not a segment) goes to the first empty box
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).getAttribute('role') === 'spinbutton') return
        e.preventDefault()
        const empty = order.find((s) => (s === 'period' ? parts.pm : parts[s]) === null)
        focus(empty ?? 'hour')
      }}
      className={control({ size, invalid: field.invalid, disabled: field.disabled, className: cn('w-fit min-w-36 cursor-text', className) })}
    >
      <span className="flex flex-1 items-center text-ink">
        {segment(
          'hour',
          parts.hour === null ? null : pad(parts.hour),
          '--',
          parts.hour,
          hourLo,
          hourHi,
          undefined,
          // Read after the field's label: "Starts, hours"
          ariaLabel ? `${ariaLabel}, hours` : 'hours'
        )}
        <span aria-hidden className="px-px text-ink-faint">
          :
        </span>
        {segment('minute', parts.minute === null ? null : pad(parts.minute), '--', parts.minute, 0, 59, undefined, ariaLabel ? `${ariaLabel}, minutes` : 'minutes')}
        {clock.twelve ? (
          <>
            <span aria-hidden className="w-1.5" />
            {segment(
              'period',
              parts.pm === null ? null : parts.pm ? clock.pm : clock.am,
              '--',
              parts.pm === null ? null : parts.pm ? 1 : 0,
              0,
              1,
              parts.pm === null ? undefined : parts.pm ? clock.pm : clock.am,
              ariaLabel ? `${ariaLabel}, ${clock.am} or ${clock.pm}` : `${clock.am} or ${clock.pm}`
            )}
          </>
        ) : null}
      </span>
      <span className={controlIcon}>
        <Clock aria-hidden />
      </span>
      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
    </div>
  )
}
