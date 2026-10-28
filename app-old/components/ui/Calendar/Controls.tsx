'use client'
import React from 'react'
import clsx from 'clsx'
import { 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react'
import { useCalendar } from './Context'
import { Button } from '../Button'

export type CalendarControlsProps = React.HTMLAttributes<HTMLElement> & {
  className?: string
  onNextMonth?: () => void
  onPreviousMonth?: () => void
}

export const CalendarControls: React.FC<CalendarControlsProps> = ({
  className,
  onNextMonth,
  onPreviousMonth,
  ...props
}) => {
  const {
    seekToNextMonth,
    seekToPreviousMonth,
    seekToToday,
  } = useCalendar()

  const handleNextMonth = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    seekToNextMonth()
    onNextMonth?.()
  }

  const handlePreviousMonth = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    seekToPreviousMonth()
    onPreviousMonth?.()
  }

  const handleToday = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    seekToToday()
  }

  return (
    <nav
      {...props}
      className={clsx('calendar-controls', className)}>
      <ul className="calendar-controls__list">
        <li className="calendar-controls__item">
          <Button
            variant="primary"
            size="xs"
            className="calendar-controls__button control-prev"
            aria-label="Previous Month"
            onClick={handlePreviousMonth}>
            <ChevronLeft className="calendar-controls__icon" />
          </Button>
        </li>
        <li className="calendar-controls__item">
          <Button
            variant="text"
            size="small"
            className="calendar-controls__button control-today"
            aria-label="Today"
            onClick={handleToday}>
            <span className="calendar-controls__label">Today</span>
          </Button>
        </li>
        <li className="calendar-controls__item">
          <Button
            variant="primary"
            size="xs"
            className="calendar-controls__button control-next"
            aria-label="Next Month"
            onClick={handleNextMonth}>
            <ChevronRight className="calendar-controls__icon" />
          </Button>
        </li>
      </ul>
    </nav>
  )
}