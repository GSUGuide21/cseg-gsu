'use client'
import clsx from 'clsx'
import React, { 
  useState 
} from 'react'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  helperText?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  id,
  className,
  ...props
}) => {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const handleFocus = () => setIsFocused(true)
  const handleBlur = () => setIsFocused(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    setIsDirty(!!e.target.value)
  }

  const hasError = !!error && isDirty
  const hasHelperText = !!helperText && !hasError

  return (
    <div className={clsx('field-container input', className, {
      'error': hasError,
      'has-helper-text': hasHelperText,
      'focused': isFocused,
      'dirty': isDirty,
    })}>
      {label && <label htmlFor={id} className="input__label">{label}</label>}
      <input
        {...props}
        id={id}
        className="input__field"
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
      />
    </div>
  )
}