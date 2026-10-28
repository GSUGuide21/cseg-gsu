'use client'
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect
} from 'react'
import type { 
  SwitchContextType, 
  SwitchProviderProps 
} from './types'

export const SwitchContext = createContext<SwitchContextType | undefined>(undefined)

export const useSwitchContext = (): SwitchContextType => {
  const context = useContext(SwitchContext)
  if (!context) throw new Error('useSwitchContext() must be used within a SwitchProvider')
  return context
}

export const SwitchProvider: React.FC<SwitchProviderProps> = ({
  name,
  inactiveLabel = 'Off',
  activeLabel = 'On',
  checked = false,
  disabled = false,
  showLabels = true,
  onChange,
  onInput,
  onFocus,
  onBlur,
  onKeyDown,
  children
}) => {
  const [isChecked, setIsChecked] = useState<boolean>(checked)
  const [isFocused, setIsFocused] = useState<boolean>(false)
  const [isDirty, setIsDirty] = useState<boolean>(false)

  const handleChange = useCallback((value: boolean) => {
    if (disabled) return
    setIsChecked(value)
    setIsDirty(true)
    onChange?.(value)
    onInput?.(value)
  }, [disabled, onChange, onInput])

  const handleFocus = useCallback(() => {
    if (disabled) return
    setIsFocused(true)
    onFocus?.(isChecked)
  }, [disabled, isChecked, onFocus])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onBlur?.(isChecked)
  }, [isChecked, onBlur])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled || !isFocused) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleChange(!isChecked)
      onKeyDown?.(isChecked)
    }
  }, [disabled, isFocused, isChecked, handleChange, onKeyDown])

  useEffect(() => {
    setIsChecked(checked)
  }, [checked])

  return (
    <SwitchContext.Provider value={{
      checked: isChecked,
      setChecked: setIsChecked,
      focused: isFocused,
      setFocused: setIsFocused,
      dirty: isDirty,
      setDirty: setIsDirty,
      activeLabel,
      inactiveLabel,
      name,
      disabled,
      showLabels,
      handleChange,
      handleFocus,
      handleBlur,
      handleKeyDown
    }}>
      {children}
    </SwitchContext.Provider>
  )
}