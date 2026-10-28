'use client'
import React, {
  useState
} from 'react'
import clsx from 'clsx'

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
  helperText?: string
}

export const TextArea: React.FC<TextAreaProps> = ({
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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    setIsDirty(!!e.target.value)
  }

  const hasError = !!error && isDirty
  const hasHelperText = !!helperText && !hasError

  return (
    <div className={clsx('field-container textarea', className, {
      'error': hasError,
      'has-helper-text': hasHelperText,
      'focused': isFocused,
      'dirty': isDirty,
    })}>
      {label && <label htmlFor={id} className="textarea__label">{label}</label>}
      <textarea
        {...props}
        id={id}
        className="textarea__field"
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
      />
    </div>
  )

}
