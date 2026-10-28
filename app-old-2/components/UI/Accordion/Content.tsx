'use content'
import React from 'react'
import clsx from 'clsx'

export type AccordionContentProps = React.HTMLAttributes<HTMLElement> & {
  open?: boolean // default: false
  disabled?: boolean // default: false
  focused?: boolean // default: false
}

export const AccordionContent: React.FC<AccordionContentProps> = ({
  open = false,
  disabled = false,
  focused = false,
  className,
  children,
  ...props
}) => {
  return (
    <div
      {...props}
      className={clsx(
        'accordion-content',
        {
          'accordion-content--open': open,
          'accordion-content--disabled': disabled,
          'accordion-content--focused': focused,
        },
        className
      )}>
      {children}
    </div>
  )
}