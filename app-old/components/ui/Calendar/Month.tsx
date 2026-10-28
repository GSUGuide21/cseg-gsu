'use client'
import React from 'react'
import clsx from 'clsx'
import { useCalendar } from './Context'

export type CalendarMonthProps = React.HTMLAttributes<HTMLElement> & {
  useShortMonth?: boolean // Use short month names (e.g., Jan, Feb, Mar), default is false
}

export const CalendarMonth: React.FC<CalendarMonthProps> = ({
  useShortMonth = false,
  className,
  ...props
}) => {
  const {
    currentMonth,
    getCurrentShortMonthName,
    getCurrentMonthName,
    getCurrentYear
  } = useCalendar()

  return (
    <h3
      {...props}
      className={clsx('calendar-month', className)}
      data-month={currentMonth}>
      <span className="calendar-month__name">
        {useShortMonth ? getCurrentShortMonthName() : getCurrentMonthName()}
      </span>
      <span className="calendar-month__separator">{' '}</span>
      <span className="calendar-month__year">
        {getCurrentYear()}
      </span>
    </h3>
  )
}