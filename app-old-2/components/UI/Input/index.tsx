'use client'
import React, { 
  useState, 
  useCallback 
} from 'react'
import clsx from 'clsx'
import { 
  Field, 
  type FieldProps 
} from '@/app-old-2/components/UI/Field'

export type InputProps = Omit<FieldProps & React.InputHTMLAttributes<HTMLInputElement>, 'children' | 'fieldId'>

export const Input: React.FC<InputProps> = ({
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentValue(e.target.value)
    setIsDirty(!!e.target.value)
  }, [setCurrentValue, setIsDirty])

  return (
    <Field
      label={label}
      error={hasError ? error : ''}
      helperText={helperText}
      disabled={disabled}
      className={clsx('input', className, {
        'focused': isFocused,
        'dirty': isDirty,
        'error': hasError,
        'disabled': disabled,
        'has-helper-text': !!helperText && !hasError,
      })}
      fieldId={id}>
      <input
        {...props}
        id={id}
        className="input__field"
        value={currentValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        disabled={disabled} />
    </Field>
  )
}