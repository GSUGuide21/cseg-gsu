'use client'

import { useId, type FC } from 'react'

import { cn } from '@/lib/cn'

import { useField } from '../Field'
import { useControllable } from '../useControllable'
import type { SegmentedControlProps } from './types'

/** Each segment is 8px shorter than a control of the same size, so the whole bar matches one */
const SEGMENT = { sm: 'min-h-7 text-[0.82rem]', md: 'min-h-9 text-[0.9rem]', lg: 'min-h-11 text-[0.95rem]' }

/**
 * A few choices side by side, one picked: Day / Week / Month, List / Grid. For more than
 * about five, or long labels, use a RadioGroup or Select.
 *
 *   <Field label="View">
 *     <SegmentedControl options={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }]} />
 *   </Field>
 *
 * Native radio buttons underneath: the arrow keys move the pick, and it's sent with a form.
 * Use Tabs instead when each choice shows a different panel.
 */
export const SegmentedControl: FC<SegmentedControlProps> = ({
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  name,
  size = 'md',
  fitted = false,
  disabled = false,
  'aria-label': ariaLabel,
  className,
}) => {
  const firstEnabled = options.find((o) => !o.disabled)?.value ?? null
  const [value, setValue] = useControllable<string | null>(valueProp, defaultValue === undefined ? firstEnabled : defaultValue, (v) => v !== null && onValueChange?.(v))
  const field = useField()
  const generated = useId()
  const group = name ?? generated
  const off = disabled || !!field?.disabled

  return (
    <div
      role="radiogroup"
      // The Field's id goes on the group: on the first radio, its label would rename that one
      id={field?.id}
      aria-labelledby={ariaLabel ? undefined : field?.labelId}
      aria-label={ariaLabel}
      aria-describedby={[field?.descriptionId, field?.errorId].filter(Boolean).join(' ') || undefined}
      aria-disabled={off || undefined}
      className={cn('inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-fill p-1', fitted && 'flex w-full', className)}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            'relative flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 font-semibold whitespace-nowrap text-ink-soft transition-colors select-none [&_svg]:size-4 [&_svg]:shrink-0',
            SEGMENT[size],
            'hover:text-ink has-checked:bg-surface has-checked:text-ink has-checked:shadow-[0_1px_3px_rgb(0_0_0/0.12)]',
            'has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-brand',
            'has-disabled:cursor-not-allowed has-disabled:opacity-45',
            fitted && 'flex-1'
          )}
        >
          <input
            type="radio"
            name={group}
            value={o.value}
            checked={value === o.value}
            disabled={off || o.disabled}
            aria-label={o['aria-label']}
            onChange={(e) => e.target.checked && setValue(o.value)}
            className="absolute size-px appearance-none opacity-0"
          />
          {o.icon}
          {o.label}
        </label>
      ))}
    </div>
  )
}
