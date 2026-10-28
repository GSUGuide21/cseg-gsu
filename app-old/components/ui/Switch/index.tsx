'use client'
import React, {
  useState,
  useCallback,
  useEffect
} from 'react'
import clsx from 'clsx'
import './index.scss'

export type SwitchProps = React.HTMLAttributes<HTMLElement> & {
  label: string // default: ''
  options: string[] // default: []
  value: boolean // default: false
  disabled?: boolean // default: false
  onChange?: (value: boolean) => void
  onInput?: (value: boolean) => void
  onFocus?: (value: boolean) => void
  onBlur?: (value: boolean) => void
  onKeyDown?: (value: boolean) => void
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  options = [],
  value = false,
  disabled = false,
  onChange,
  onInput,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  ...props
}) => {
  const [isChecked, setIsChecked] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const handleChange = useCallback(() => {
    setIsChecked((prev) => !prev)
    setIsDirty(true)
    onChange?.(!isChecked)
    onInput?.(!isChecked)
  }, [isChecked, onChange, onInput])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    onFocus?.(isChecked)
  }, [isChecked, onFocus])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onBlur?.(isChecked)
  }, [isChecked, onBlur])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        handleChange()
        onKeyDown?.(isChecked)
        break
      case 'Tab':
        setIsFocused(false)
        onKeyDown?.(isChecked)
        break
    }
  }, [isChecked, handleChange, onKeyDown])

  useEffect(() => {
    setIsChecked(value)
  }, [value])

  return (
    <div
      {...props}
      className={clsx('field-container switch', {
        'error': disabled,
        'has-helper-text': isDirty,
        'focused': isFocused,
        'dirty': isDirty,
      }, className)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      onClick={handleChange}
      aria-checked={isChecked}
      aria-disabled={disabled}
      aria-label={label}
      role="switch">
      <label className={clsx('switch__label', {
        'switch__label--disabled': disabled,
        'switch__label--active': isChecked,
        'switch__label--focused': isFocused,
        'switch__label--dirty': isDirty
      })}>
        {label}
      </label>
      <div className="switch__options">
        <span className={clsx('switch__option', {
          'switch__option--active': isChecked,
          'switch__option--disabled': disabled,
        })}>{options[0] || 'Off'}</span>
        <div className={clsx("switch__toggle", {
          on: isChecked,
          off: !isChecked,
          'switch__toggle--disabled': disabled,
        })}>
          <div className={clsx('switch__toggle-track', {
            'switch__toggle-track--active': isChecked,
            'switch__toggle-track--disabled': disabled,
          })} />
          <span className={clsx('switch__toggle-knob', {
            'switch__toggle-knob--active': isChecked,
            'switch__toggle-knob--disabled': disabled,
          })} />
        </div>
        <span className={clsx('switch__option', {
          'switch__option--active': !isChecked,
          'switch__option--disabled': disabled,
        })}>{options[1] || 'On'}</span>
      </div>
    </div>
  )
}
