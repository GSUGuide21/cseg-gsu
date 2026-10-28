'use client'
import React from 'react'
import clsx from 'clsx'

export type CalendarDayProps = React.HTMLAttributes<HTMLElement> & {
  day: number
  isToday?: boolean
  isSelected?: boolean
  isWeekend?: boolean
  isInCurrentMonth?: boolean
}

export const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  isToday = false,
  isSelected = false,
  isWeekend = false,
  isInCurrentMonth = false,
  className,
  ...props
}) => {
  return (
    <div
      {...props}
      className={clsx('calendar-day', {
        'calendar-day--today': isToday,
        'calendar-day--selected': isSelected,
        'calendar-day--weekend': isWeekend,
        'calendar-day--current-month': isInCurrentMonth,
      }, className)}
      data-day={day}>
      <span className="calendar-day__number">
        {day}
      </span>
      {/* {isToday && <span className="calendar-day__today-indicator">Today</span>} */}
    </div>
  )
}