'use client'

import { CalendarDays } from 'lucide-react'
import { useId, type FC } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControl } from '../Field'
import { control, controlButton, controlInput, footerButton, panel } from '../Input/variants'
import { useControllable } from '../useControllable'
import { popoverPlacement, usePopover } from '../usePopover'
import { Calendar } from './Calendar'
import type { DatePickerProps } from './types'
import { useTypedDate } from './useTypedDate'
import { datePattern, inRange, today } from './utils'

/**
 * A date: type it ("10/27/2026", "2026-10-27", "Oct 27") or pick it from the calendar
 * button. Typing is read when leaving the box or pressing Enter; a date that can't be read
 * or isn't allowed stays in the box, marked invalid, so it can be fixed.
 */
export const DatePicker: FC<DatePickerProps> = ({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  min,
  max,
  isDateDisabled,
  weekStartsOn,
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
  const allowed = (iso: string) => inRange(iso, min, max) && !isDateDisabled?.(iso)
  const typed = useTypedDate(value, locale, allowed)
  const popover = usePopover()
  const dialogId = useId()
  const field = useFieldControl({ id, disabled, required, invalid: invalid || typed.unreadable || undefined, 'aria-describedby': describedBy })

  const pick = (iso: string | null) => {
    setValue(iso)
    typed.reset()
    popover.hide()
  }

  return (
    <div ref={popover.rootRef} onKeyDown={popover.onKeyDown} className={cn('relative w-full', className)}>
      <div className={control({ size, invalid: field.invalid, disabled: field.disabled, floating: field.floating, className: 'pr-1.5' })}>
        <input
          {...field.controlProps}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          value={typed.text}
          placeholder={placeholder ?? (field.floating ? ' ' : datePattern(locale))}
          onChange={(e) => typed.type(e.target.value)}
          onBlur={(e) => {
            if (typed.typing) typed.commit(e.target.value, setValue)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && typed.typing) {
              e.preventDefault()
              typed.commit(e.currentTarget.value, setValue)
            } else if (e.key === 'ArrowDown' && e.altKey) {
              e.preventDefault()
              popover.show()
            }
          }}
          className={controlInput}
        />
        <button
          ref={popover.triggerRef}
          type="button"
          onClick={popover.toggle}
          disabled={field.disabled}
          aria-label="Choose date"
          aria-haspopup="dialog"
          aria-expanded={popover.open}
          aria-controls={popover.open ? dialogId : undefined}
          className={cn(controlButton, field.floating && 'self-center', popover.open && 'bg-brand-tint text-brand')}
        >
          <CalendarDays size={17} aria-hidden />
        </button>
      </div>

      {popover.open ? (
        <div ref={popover.panelRef} id={dialogId} role="dialog" aria-modal="false" aria-label="Choose date" className={cn(panel, 'right-0 flex flex-col gap-3 p-4', popoverPlacement(popover.above))}>
          <Calendar
            value={value}
            onValueChange={pick}
            min={min}
            max={max}
            isDateDisabled={isDateDisabled}
            weekStartsOn={weekStartsOn}
            locale={locale}
            autoFocus
          />
          <div className="flex justify-between gap-2 border-t border-line pt-3">
            <button type="button" onClick={() => pick(null)} className={cn(footerButton, 'text-ink-soft hover:bg-fill hover:text-ink')}>
              Clear
            </button>
            <button type="button" onClick={() => pick(today())} disabled={!allowed(today())} className={cn(footerButton, 'text-brand hover:bg-brand-tint')}>
              Today
            </button>
          </div>
        </div>
      ) : null}

      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
    </div>
  )
}

