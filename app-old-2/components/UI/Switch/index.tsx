/* 'use client'
import React, { 
  useState, 
  useCallback,
  useEffect
} from 'react'
import clsx from 'clsx'
import { Field } from '../Field'
import { SwitchProps } from './types'
import './index.scss'

export const Switch: React.FC<SwitchProps> = ({
  label,
  name,
  error = '',
  inactiveLabel = 'Off',
  activeLabel = 'On',
  helperText = '',
  checked = false,
  disabled = false,
  onChange,
  onInput,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  ...props
}) => {
  const [isChecked, setIsChecked] = useState<boolean>(checked)
  const [isFocused, setIsFocused] = useState<boolean>(false)
  const [isDirty, setIsDirty] = useState<boolean>(false)

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
    if (disabled || !isFocused) return
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
      case 'Left':
      case 'ArrowLeft':
        setIsChecked(false)
        onKeyDown?.(false)
        break
      case 'Right':
      case 'ArrowRight':
        setIsChecked(true)
        onKeyDown?.(true)
        break
    }
  }, [isChecked, handleChange, onKeyDown, disabled, isFocused])

  useEffect(() => {
    if (disabled) {
      setIsChecked(false)
      setIsFocused(false)
    }
  }, [disabled])

  useEffect(() => setIsChecked(checked), [checked])

  const hasError = !!error && isDirty
  const hasHelperText = !!helperText && !hasError

  return (
    <Field
      {...props}
      className={clsx('switch', className, {
        'focused': isFocused,
        'dirty': isDirty,
        'error': hasError,
        'disabled': disabled,
        'has-helper-text': hasHelperText
      })}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      label={label}>
      <SwitchOptions
        name={name}
        checked={isChecked}
        inactiveLabel={inactiveLabel}
        activeLabel={activeLabel}
        disabled={disabled}
        onChange={handleChange} />
    </Field>
  )
} */
'use client'
import React from 'react'
import { SwitchContainer } from './Container'
import { SwitchProvider } from './Context'
import { SwitchProps } from './types'

export const Switch: React.FC<SwitchProps> = ({
  label = '',
  name = '',
  error = '',
  inactiveLabel = 'Off',
  activeLabel = 'On',
  helperText = '',
  checked = false,
  disabled = false,
  onChange,
  onInput,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  ...props
}) => {
  return (
    <SwitchProvider 
      name={name}
      activeLabel={activeLabel}
      inactiveLabel={inactiveLabel}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      onInput={onInput}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}>
      <SwitchContainer
        {...props}
        className={className}
        error={error}
        label={label}
        helperText={helperText} />
    </SwitchProvider>
  )
}