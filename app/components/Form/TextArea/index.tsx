'use client'

import { useId, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControl } from '../Field'
import { control, controlInput } from '../Input/variants'
import type { TextAreaProps } from './types'

/** Multi-line text, with an optional character count. */
export const TextArea: FC<TextAreaProps> = ({
  autoResize = true,
  showCount,
  maxLength,
  rows = 4,
  invalid,
  className,
  textAreaClassName,
  id,
  disabled,
  required,
  placeholder,
  value,
  defaultValue,
  onChange,
  'aria-describedby': describedBy,
  ...props
}) => {
  const countId = useId()
  const counting = showCount ?? maxLength !== undefined
  // Only tracked to show the count; the textarea itself stays controlled or not, as passed
  const [typed, setTyped] = useState(() => String(defaultValue ?? '').length)
  const length = value !== undefined ? String(value).length : typed

  const field = useFieldControl({
    id,
    disabled,
    required,
    invalid,
    'aria-describedby': [describedBy, counting ? countId : undefined].filter(Boolean).join(' ') || undefined,
  })

  return (
    <div className="flex flex-col gap-1">
      <div
        className={control({
          multiline: true,
          invalid: field.invalid,
          disabled: field.disabled,
          floating: field.floating,
          className: cn('h-auto', className),
        })}
      >
        <textarea
          {...props}
          {...field.controlProps}
          rows={rows}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder ?? (field.floating ? ' ' : undefined)}
          onChange={(e) => {
            setTyped(e.target.value.length)
            onChange?.(e)
          }}
          // field-sizing grows the box with its text; `rows` stays the minimum height
          style={autoResize ? { minHeight: `${rows}lh`, ...props.style } : props.style}
          className={cn(
            controlInput,
            'resize-y leading-relaxed',
            autoResize && 'field-sizing-content max-h-[24lh]',
            textAreaClassName
          )}
        />
      </div>
      {counting ? (
        <p
          id={countId}
          className={cn(
            'm-0 self-end text-[0.75rem] text-muted tabular-nums',
            maxLength !== undefined && length >= maxLength && 'font-semibold text-danger'
          )}
        >
          {maxLength !== undefined ? `${length} / ${maxLength}` : `${length} characters`}
        </p>
      ) : null}
    </div>
  )
}
