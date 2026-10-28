'use client'
import React from 'react'
import clsx from 'clsx'
import { CalendarHeader } from './Header'
import { CalendarContent } from './Content'
import { CalendarWeekdays } from './Weekdays'
import { CalendarDays } from './Days'
import { CalendarProvider } from './Context'
import './index.scss'

export type CalendarProps = React.HTMLAttributes<HTMLElement> & {
  initialDate?: Date
}

export const Calendar: React.FC<CalendarProps> = ({
  initialDate,
  className,
  ...props
}) => {
  return (
    <CalendarProvider initialDate={initialDate}>
      <div 
        {...props}
        className={clsx('calendar', className)}>
        <CalendarHeader />
        <CalendarContent>
          <CalendarWeekdays />
          <CalendarDays />
        </CalendarContent>
      </div>
    </CalendarProvider>
  )
}