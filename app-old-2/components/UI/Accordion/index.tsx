'use client'
import React from 'react'
import { AccordionContainer } from './Container'
import { AccordionProvider } from './Context'
import './index.scss'

export type AccordionProps = React.HTMLAttributes<HTMLElement> & {
  title: string // default: ''
  open?: boolean // default: false
  disabled?: boolean // default: false
  onChange?: (value: boolean) => void
  onFocus?: () => void
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
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
  return (
    <AccordionProvider 
      open={open} 
      disabled={disabled}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}>
      <AccordionContainer 
        {...props}
        title={title}
        className={className}>{children}</AccordionContainer>
    </AccordionProvider>
  )
}