'use client'
import React from 'react'
import clsx from 'clsx'
import { CalendarControls } from './Controls'
import { CalendarMonth } from './Month'

export type CalendarHeaderProps = React.HTMLAttributes<HTMLElement> & {
  useShortMonth?: boolean // Use short month names (e.g., Jan, Feb, Mar), default is false
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  useShortMonth = false,
  className,
  ...props
}) => (
  <header
    {...props}
    className={clsx('calendar-header', className)}>
    <CalendarControls />
    <CalendarMonth useShortMonth={useShortMonth} />
  </header>
)