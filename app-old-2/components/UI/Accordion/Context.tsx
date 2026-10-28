'use client'
import React, { 
  useCallback,
  useState,
  useEffect,
  createContext,
  useContext,
  Dispatch,
  SetStateAction
} from 'react'

export type AccordionContextType = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  toggleOpen: () => void
  disabled: boolean
  focused: boolean
  onChange: (value: boolean) => void
  onFocus: () => void
  onBlur: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export const AccordionContext = createContext<AccordionContextType | undefined>(undefined)

export const useAccordionContext = () => {
  const context = useContext(AccordionContext)
  if (!context) throw new Error('useAccordionContext must be used within an AccordionProvider')
  return context
}

export type AccordionProviderProps = React.HTMLAttributes<HTMLElement> & {
  open?: boolean // default: false
  disabled?: boolean // default: false
  onChange?: (value: boolean) => void
  onFocus?: () => void
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
}

export const AccordionProvider: React.FC<AccordionProviderProps> = ({
  open = false,
  disabled = false,
  children,
  onChange,
  onFocus,
  onBlur,
  onKeyDown
}) => {
  const [isOpen, setIsOpen] = useState(open)
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = useCallback((value: boolean) => {
    if (disabled) return
    setIsOpen(value)
    onChange?.(value)
  }, [onChange, disabled])

  const toggleOpen = useCallback(() => {
    if (disabled) return 
    setIsOpen(prev => !prev)
  }, [disabled])

  const handleFocus = useCallback(() => {
    if (disabled) return
    setIsFocused(true)
    onFocus?.()
  }, [onFocus, disabled])

  const handleBlur = useCallback(() => {
    if (disabled) return
    setIsFocused(false)
    onBlur?.()
  }, [onBlur, disabled])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        handleChange(!isOpen)
        break
      case 'ArrowDown':
        e.preventDefault()
        setIsOpen(true)
        break
      case 'ArrowUp':
        e.preventDefault()
        setIsOpen(false)
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
      default:
        break
    }
    onKeyDown?.(e)
  }, [isOpen, handleChange, onKeyDown, disabled])

  useEffect(() => {
    if (disabled) setIsOpen(false)
  }, [disabled, setIsOpen])

  return (
    <AccordionContext.Provider
      value={{
        open: isOpen,
        setOpen: setIsOpen,
        toggleOpen,
        disabled,
        focused: isFocused,
        onChange: handleChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onKeyDown: handleKeyDown
      }}>
      {children}
    </AccordionContext.Provider>
  )
}