'use client'
import React from 'react'
import clsx from 'clsx'
import { Field } from '../Field'
import { useSwitchContext } from './Context'
import { SwitchIndicator } from './Indicator'
import { SwitchContainerProps } from './types'

export const SwitchContainer: React.FC<SwitchContainerProps> = ({
  className,
  error = '',
  label = '',
  helperText = '',
  ...props
}) => {
  const { 
    focused, 
    dirty, 
    disabled,
    handleFocus,
    handleBlur,
    handleKeyDown 
  } = useSwitchContext()

  const hasError = !!error && dirty
  const hasHelperText = !!helperText && !hasError

  return (
    <Field 
      {...props} 
      className={clsx('switch', className, {
        focused,
        dirty,
        disabled,
        error: hasError,
        'has-helper-text': hasHelperText,
      })}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      label={label}
      error={error}
      helperText={helperText}>
      <SwitchIndicator />
    </Field>
  )
}