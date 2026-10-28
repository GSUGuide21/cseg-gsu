'use client'
import React, { useCallback } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useAccordionContext } from './Context'

export type AccordionHeaderProps = React.HTMLAttributes<HTMLElement>

export const AccordionHeader: React.FC<AccordionHeaderProps> = ({
  className,
  children,
  ...props
}) => {
  const { open, toggleOpen, disabled, onChange } = useAccordionContext()

  const handleClick = useCallback(() => {
    if (disabled) return
    toggleOpen()
    onChange?.(!open)
  }, [toggleOpen, open, disabled, onChange])

  return (
    <header
      {...props}
      className={clsx('accordion-header', className)}
      onClick={handleClick}>
      <h3 className="accordion-header__title">{children}</h3>
      <span className={clsx("accordion-header__icon", {
        'accordion-header__icon--open': open
      })}>
        <ChevronDown
          className="accordion-header__icon--close"
          size={16}/>
      </span>
    </header>
  )
}