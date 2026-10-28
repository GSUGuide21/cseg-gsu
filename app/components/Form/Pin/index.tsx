'use client'

import { useRef, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControl } from '../Field'
import { useControllable } from '../useControllable'
import type { PinInputProps } from './types'

/**
 * A short code in separate boxes: a sign-in or email verification code, a PIN.
 *
 *   <Field label="Code from your email" description="It expires in 10 minutes.">
 *     <PinInput onComplete={verify} />
 *   </Field>
 *
 * It's one real input drawn as boxes, so typing, pasting the whole code, the phone's
 * "from Messages" autofill (autocomplete="one-time-code"), and screen readers all work as
 * they would in any text field.
 */
export const PinInput: FC<PinInputProps> = ({
  length = 6,
  type = 'numeric',
  value: valueProp,
  defaultValue = '',
  onValueChange,
  onComplete,
  mask = false,
  name,
  id,
  disabled,
  required,
  invalid,
  autoFocus,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  className,
}) => {
  const [value, setValue] = useControllable(valueProp, defaultValue, onValueChange)
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const field = useFieldControl({ id, disabled, required, invalid, 'aria-describedby': describedBy })
  const numeric = type === 'numeric'
  const chars = value.slice(0, length).split('')
  // The box the next character goes in (the last one once full)
  const at = Math.min(chars.length, length - 1)

  const clean = (raw: string) => (numeric ? raw.replace(/\D/g, '') : raw.replace(/[^a-z0-9]/gi, '').toUpperCase()).slice(0, length)
  // Typing always goes at the end, like filling boxes in order
  const toEnd = () => requestAnimationFrame(() => ref.current?.setSelectionRange(length, length))

  return (
    <div className={cn('relative inline-flex max-w-full gap-2', field.disabled && 'opacity-60', className)} onClick={() => ref.current?.focus()}>
      <input
        {...field.controlProps}
        ref={ref}
        name={name}
        value={value}
        autoFocus={autoFocus}
        aria-label={field.labelId ? undefined : (ariaLabel ?? 'Verification code')}
        inputMode={numeric ? 'numeric' : 'text'}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={length}
        pattern={numeric ? `\\d{${length}}` : `[A-Za-z0-9]{${length}}`}
        onChange={(e) => {
          const next = clean(e.target.value)
          setValue(next)
          if (next.length === length && next !== value) onComplete?.(next)
        }}
        onFocus={() => {
          setFocused(true)
          toEnd()
        }}
        onBlur={() => setFocused(false)}
        onSelect={toEnd}
        // On top of the boxes, invisible: it takes the typing, the boxes show it
        className="absolute inset-0 z-1 size-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed"
      />
      {Array.from({ length }, (_, i) => {
        const char = chars[i]
        const active = focused && i === at
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-lg border bg-surface text-[1.25rem] font-bold text-ink tabular-nums transition-colors sm:size-12',
              field.invalid ? 'border-danger' : active ? 'border-brand ring-3 ring-brand/20' : char ? 'border-ink-faint/50' : 'border-line',
              field.disabled && 'bg-fill'
            )}
          >
            {char ? (mask ? '•' : char) : active ? <span className="h-5 w-px animate-pulse bg-ink motion-reduce:animate-none" /> : null}
          </span>
        )
      })}
    </div>
  )
}
