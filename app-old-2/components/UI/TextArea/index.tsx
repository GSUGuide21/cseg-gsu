'use client'
import React, { useState } from 'react'
import clsx from 'clsx'
import { 
  Field, 
  type FieldProps 
} from '../Field'

export type TextAreaProps = Omit<FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'children' | 'fieldId'>

export const TextArea: React.FC<TextAreaProps> = ({
  label = '',
  error = '',
  helperText = '',
  disabled = false,
  value = '',
  id,
  className,
  ...props
}) => {
  const [currentValue, setCurrentValue] = useState(value)
  const [isFocused, setIsFocused] = useState<boolean>(false)
  const [isDirty, setIsDirty] = useState<boolean>(false)

  const hasError = !!error && isDirty

  const handleFocus = () => setIsFocused(true)
  const handleBlur = () => setIsFocused(false)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentValue(e.target.value)
    setIsDirty(!!e.target.value)
  }

  return (
    <Field
      label={label}
      error={hasError ? error : ''}
      helperText={helperText}
      disabled={disabled}
      className={clsx('textarea', className, {
        'focused': isFocused,
        'dirty': isDirty,
        'error': hasError,
        'disabled': disabled,
        'has-helper-text': !!helperText && !hasError,
      })}
      fieldId={id}>
      <textarea
        {...props}
        id={id}
        className="textarea__field"
        value={currentValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        disabled={disabled} />
    </Field>
  )
}