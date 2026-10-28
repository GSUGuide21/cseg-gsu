'use client'
import React from 'react'
import clsx from 'clsx'
import { CircleHelp } from 'lucide-react'

export type FieldProps = React.HTMLAttributes<HTMLElement> & {
  fieldId?: string // default: ''
  label?: React.ReactNode // default: ''
  error?: string // default: ''
  disabled?: boolean // default: false
  helperText?: string // default: ''
  borderLess?: boolean // default: false
}

export const Field: React.FC<FieldProps> = ({
  label = '',
  error = '',
  helperText = '',
  disabled = false,
  borderLess = false,
  className,
  fieldId,
  children,
  ...props
}) => {
  return (
    <div
      {...props}
      className={clsx('field', className, {
        'field--disabled': disabled,
        'field--error': !!error,
        'field--borderless': borderLess,
      })}>
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {label}
        </label>
      )}
      <div className="field-content__wrapper">
        <div className="field-content">{children}</div>
        {helperText && (
          <div className="field-help">
            <CircleHelp className="field-help-icon" />
            <span className="field-helper-text">{helperText}</span>
          </div>
        )}
      </div>
      <div className="field-content">{children}</div>
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}