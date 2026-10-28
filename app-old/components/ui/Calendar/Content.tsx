'use client'
import React from 'react'
import clsx from 'clsx'

export type CalendarContentProps = React.HTMLAttributes<HTMLElement>

export const CalendarContent: React.FC<CalendarContentProps> = ({
  className,
  ...props
}) => {
  return (
    <section
      {...props}
      className={clsx('calendar-content', className)}>
      {props.children}
    </section>
  )
}