'use client'

import { useId, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { DatePicker } from '../Date'
import { useField } from '../Field'
import { TimeInput } from '../Time'
import { useControllable } from '../useControllable'
import type { DateTimePickerProps } from './types'

const split = (v: string | null | undefined) => {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(v ?? '')
  return m ? { date: m[1], time: m[2] } : null
}

/**
 * A date and a time side by side, under one label. The Field's label names both
 * ("Starts" → "Starts" and "Starts, time"), and the value is only reported whole.
 *
 *   <Field label="Starts"><DateTimePicker name="startsAt" step={15} /></Field>
 */
export const DateTimePicker: FC<DateTimePickerProps> = ({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  min,
  max,
  isDateDisabled,
  weekStartsOn,
  step,
  timeType,
  minTime,
  maxTime,
  locale = 'en-US',
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
  // A half filled in before the other is kept here; once both are set, `value` holds them
  const [partial, setPartial] = useState(() => split(defaultValue) ?? { date: '', time: '' })
  const field = useField()
  const timeLabelId = useId()
  const parts = split(value) ?? partial

  const change = (next: { date: string; time: string }) => {
    setPartial(next)
    setValue(next.date && next.time ? `${next.date}T${next.time}` : null)
  }

  const shared = { size, disabled, required, invalid, locale, 'aria-describedby': describedBy }
  return (
    <div role="group" aria-labelledby={field?.labelId} className={cn('flex w-full flex-wrap gap-2 sm:flex-nowrap', className)}>
      <DatePicker
        {...shared}
        id={id}
        value={parts.date || null}
        onValueChange={(date) => change({ ...parts, date: date ?? '' })}
        min={min}
        max={max}
        isDateDisabled={isDateDisabled}
        weekStartsOn={weekStartsOn}
        className="min-w-0 flex-[3]"
      />
      <TimeInput
        {...shared}
        type={timeType}
        // Its own id, so the Field's label only points at the date
        id={`${id ?? field?.id ?? timeLabelId}-time`}
        value={parts.time || null}
        onValueChange={(time) => change({ ...parts, time: time ?? '' })}
        step={step}
        min={minTime}
        max={maxTime}
        aria-label={field ? undefined : 'Time'}
        aria-labelledby={field ? `${field.labelId} ${timeLabelId}` : undefined}
        className="min-w-0 flex-[2] basis-36"
      />
      <span id={timeLabelId} hidden>
        time
      </span>
      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
    </div>
  )
}
