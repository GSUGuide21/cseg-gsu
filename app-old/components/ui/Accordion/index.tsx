'use client'
import React, {
  useCallback,
  useState,
  useEffect,
} from 'react'
import clsx from 'clsx'
import { AccordionHeader } from './Header'
import { AccordionItem } from './Item'
import './index.scss'

export type AccordionProps = React.HTMLAttributes<HTMLElement> & {
  title: string // default: ''
  open?: boolean // default: false
  disabled?: boolean // default: false
  onChange?: (value: boolean) => void
  onFocus?: (value: boolean) => void
  onBlur?: (value: boolean) => void
  onKeyDown?: (value: boolean) => void
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  open = false,
  disabled = false,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  children,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(open)
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = useCallback(() => {
    setIsOpen((prev) => !prev)
    onChange?.(!isOpen)
  }, [isOpen, onChange])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    onFocus?.(isOpen)
  }, [isOpen, onFocus])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onBlur?.(isOpen)
  }, [isOpen, onBlur])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        handleChange()
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
      case 'Tab':
        e.preventDefault()
        setIsFocused(false)
        break
      default:
        break
    }
    onKeyDown?.(isOpen)
  }, [isOpen, handleChange, onKeyDown])

  useEffect(() => {
    if (disabled) setIsOpen(false)
  }, [disabled, setIsOpen])

  return (
    <div
      {...props}
      className={clsx('accordion', {
        'error': disabled,
        'has-helper-text': isFocused,
        'focused': isFocused,
        'dirty': isOpen,
      }, className)}
      onClick={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-expanded={isOpen}
      aria-disabled={disabled}>
      <AccordionHeader
        title={title}
        open={isOpen}
        disabled={disabled}
        setOpen={setIsOpen}
        onChange={handleChange} />
      <AccordionItem
        isOpen={isOpen}
        isDisabled={disabled}
        isFocused={isFocused}
        className="accordion-item">
        {children}
      </AccordionItem>
    </div>
  )
}

export {
  AccordionHeader,
  AccordionItem,
}