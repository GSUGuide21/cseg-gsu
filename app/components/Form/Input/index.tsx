'use client'

import type { FC } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControl } from '../Field'
import type { InputProps } from './types'
import { control, controlIcon, controlInput } from './variants'

/** A single-line text input: text, email, password, search, tel, url, and so on. */
export const Input: FC<InputProps> = ({
  size = 'md',
  leading,
  trailing,
  invalid,
  className,
  inputClassName,
  id,
  disabled,
  required,
  placeholder,
  'aria-describedby': describedBy,
  ...props
}) => {
  const field = useFieldControl({ id, disabled, required, invalid, 'aria-describedby': describedBy })
  return (
    <div className={control({ size, invalid: field.invalid, disabled: field.disabled, floating: field.floating, className })}>
      {leading ? <span className={controlIcon}>{leading}</span> : null}
      <input
        {...props}
        {...field.controlProps}
        // A floating label watches for the (blank) placeholder to know the input is empty
        placeholder={placeholder ?? (field.floating ? ' ' : undefined)}
        className={cn(controlInput, inputClassName)}
      />
      {trailing ? <span className={cn(controlIcon, 'text-[0.85em]')}>{trailing}</span> : null}
    </div>
  )
}
