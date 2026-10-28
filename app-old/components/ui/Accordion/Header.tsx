'use client'
import React, {
  useCallback
} from 'react'
import clsx from 'clsx'
import { 
  ChevronDown, 
  // ChevronUp 
} from 'lucide-react'

export type AccordionHeaderProps = React.HTMLAttributes<HTMLElement> & {
  title: string // default: ''
  open?: boolean // default: false
  disabled?: boolean // default: false
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  onChange?: (value: boolean) => void
}

export const AccordionHeader: React.FC<AccordionHeaderProps> = ({
  title,
  open = false,
  disabled = false,
  setOpen,
  onChange,
  className,
  ...props
}) => {
  const handleClick = useCallback(() => {
    if (disabled) return
    setOpen((prev) => !prev)
    onChange?.(!open)
  }, [setOpen, open, disabled, onChange])

  return (
    <header
      {...props}
      className={clsx('accordion-header', className)}
      onClick={handleClick}>
      <h3 className="accordion-header__title">{title}</h3>
      <span className={clsx("accordion-header__icon", {
        'accordion-header__icon--open': open
      })}>
        <ChevronDown
          className="accordion-header__icon--close"
          size={16}
        />
      </span>
    </header>
  )
}