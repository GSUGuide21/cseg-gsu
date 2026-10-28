'use client'
import React from 'react'
import clsx from 'clsx'

export type AccordionItemProps = React.HTMLAttributes<HTMLElement> & {
  isOpen: boolean // default: false
  isDisabled?: boolean // default: false
  isFocused?: boolean // default: false
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  isOpen = false,
  isDisabled = false,
  isFocused = false,
  className,
  children,
  ...props
}) => {
  return (
    isOpen &&
    <section
      {...props}
      className={clsx(
        'accordion-item',
        {
          'accordion-item--disabled': isDisabled,
          'accordion-item--focused': isFocused,
        },
        className
      )}>
      {children}
    </section>
  )
}