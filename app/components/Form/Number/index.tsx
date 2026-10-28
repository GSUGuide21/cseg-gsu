'use client'

import { useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControl } from '../Field'
import { control, controlInput } from '../Input/variants'
import { useControllable } from '../useControllable'
import { NumberContext, NumberStep } from './Context'
import type { NumberInputProps } from './types'

const decimals = (n: number) => (String(n).split('.')[1] ?? '').length

const parse = (text: string) => {
  if (text.trim() === '') return null
  const n = Number(text)
  return Number.isFinite(n) ? n : undefined
}

/**
 * A number with − and + buttons. While typing, any text is allowed (so "-" or "1." aren't
 * fought); valid numbers are reported as they're typed, and leaving the field snaps the
 * value into `min`–`max`.
 */
export const NumberInput: FC<NumberInputProps> = ({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  min,
  max,
  step = 1,
  size = 'md',
  stepper = true,
  invalid,
  className,
  inputClassName,
  id,
  disabled,
  required,
  placeholder,
  onBlur,
  'aria-describedby': describedBy,
  ...props
}) => {
  const [value, setValue] = useControllable(valueProp, defaultValue, onValueChange)
  // What's in the box while typing; null shows the value itself
  const [draft, setDraft] = useState<string | null>(null)
  const field = useFieldControl({ id, disabled, required, invalid, 'aria-describedby': describedBy })

  const places = Math.max(decimals(step), decimals(min ?? 0))
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
  // Rounded so 0.1 + 0.2 shows as 0.3
  const tidy = (n: number) => Number(clamp(n).toFixed(places))

  const stepBy = (direction: 1 | -1) => {
    const from = value ?? (direction === 1 ? (min ?? 0) - step : (max ?? 0) + step)
    setValue(tidy(from + direction * step))
    setDraft(null)
  }

  return (
    <NumberContext.Provider
      value={{
        value,
        increment: () => stepBy(1),
        decrement: () => stepBy(-1),
        canIncrement: value === null || max === undefined || value < max,
        canDecrement: value === null || min === undefined || value > min,
        disabled: field.disabled,
      }}
    >
      <div
        className={control({
          size,
          invalid: field.invalid,
          disabled: field.disabled,
          floating: field.floating,
          className: cn(stepper && 'pr-1.5', className),
        })}
      >
        <input
          {...props}
          {...field.controlProps}
          type="number"
          inputMode={places ? 'decimal' : 'numeric'}
          min={min}
          max={max}
          step={step}
          value={draft ?? (value === null ? '' : String(value))}
          placeholder={placeholder ?? (field.floating ? ' ' : undefined)}
          onChange={(e) => {
            setDraft(e.target.value)
            const n = parse(e.target.value)
            if (n !== undefined) setValue(n)
          }}
          onBlur={(e) => {
            const n = parse(e.target.value)
            setValue(n === undefined || n === null ? null : tidy(n))
            setDraft(null)
            onBlur?.(e)
          }}
          className={cn(
            controlInput,
            'tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            inputClassName
          )}
        />
        {stepper ? (
          // Up over down, stacked against the right edge like a classic spinner
          <span className={cn('flex h-8 shrink-0 flex-col self-center border-l border-line pl-1', field.floating && 'h-10')}>
            <NumberStep direction="up" />
            <NumberStep direction="down" />
          </span>
        ) : null}
      </div>
    </NumberContext.Provider>
  )
}
