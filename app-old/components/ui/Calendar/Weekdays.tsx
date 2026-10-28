'use client'
import React from 'react'
import clsx from 'clsx'
import { getWeekdayNames } from '@/app-old/lib/datetime'

export type CalendarWeekdaysProps = React.HTMLAttributes<HTMLElement> & {
  useShortWeekday?: boolean // Use short weekday names (e.g., Mon, Tue, Wed), default is false
}

export const CalendarWeekdays: React.FC<CalendarWeekdaysProps> = ({
  useShortWeekday = false,
  className,
  ...props
}) => {
  const weekdays = getWeekdayNames()

  return (
    <nav
      {...props}
      className={clsx('calendar-weekdays', className)}>
      <ul className="calendar-weekdays__list">
        {weekdays.map((weekday, index) => (
          <li
            key={`calendar-weekday-${index}`}
            className="calendar-weekdays__item calendar-weekday">
            <span className="calendar-weekdays__label">{useShortWeekday ? weekday.slice(0, 3) : weekday}</span>
          </li>
        ))}
      </ul>
    </nav>
  )
}