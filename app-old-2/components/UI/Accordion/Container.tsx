'use client'
import React from 'react'
import clsx from 'clsx'
import { useAccordionContext } from './Context'
import { AccordionHeader } from './Header'
import { AccordionContent } from './Content'

export type AccordionContainerProps = React.HTMLAttributes<HTMLElement> & {
  title: string // default: ''
}

export const AccordionContainer: React.FC<AccordionContainerProps> = ({
  title,
  className,
  children,
  ...props
}) => {
  const { open, disabled } = useAccordionContext() 
  return (
    <div
      {...props}
      className={clsx('accordion', className, {
        'accordion--disabled': disabled,
        'accordion--open': open,
      })}>
      <AccordionHeader>{title}</AccordionHeader>
      <AccordionContent>{children}</AccordionContent>
    </div>
  )
}