'use client'
import React, {
  useCallback,
  useEffect,
  useState
} from 'react'
import clsx from 'clsx'
import { CalendarDay } from './Day'

import { useCalendar } from './Context'

export type CalendarDaysProps = React.HTMLAttributes<HTMLElement>
export type CalendarDayType = {
  value: number
  isToday: boolean
  isWeekend: boolean
  isCurrentMonth: boolean
}

export const CalendarDays: React.FC<CalendarDaysProps> = ({
  className,
  ...props
}) => {
  const {
    currentMonth,
    currentYear
  } = useCalendar()

  console.log(`month: ${currentMonth}, year: ${currentYear}`)

  const previousMonth = currentMonth - 1
  const nextMonth = currentMonth + 1
  // const rows = 6
  // const columns = 7

  const [days, setDays] = useState<CalendarDayType[]>([])
  
  const getDayInFirstWeek = useCallback((month: number, year: number) => {
    const firstDayOfMonth = new Date(year, month, 1)
    const firstWeekday = firstDayOfMonth.getDay()
    return firstWeekday
  }, [])

  const getDayInLastWeek = useCallback((month: number, year: number) => {
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const lastWeekday = lastDayOfMonth.getDay()
    return lastWeekday
  }, [])

  const getDaysInMonth = useCallback((month: number, year: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return daysInMonth
  }, [])

  const backfillDays = useCallback((month: number, year: number) => {
    const firstWeekday = getDayInFirstWeek(month, year) // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    console.log('month', month)
    console.log('firstWeekday', firstWeekday)
    const daysInLastMonth = getDaysInMonth(month - 1, year) // Get the number of days in the previous month
    const backfillDays = []
    for (let i = 0; i < firstWeekday; i++) backfillDays.push({
      value: daysInLastMonth - firstWeekday + i + 1,
      isToday: false,
      isWeekend: (i === 0 || i === 6),
      isCurrentMonth: false
    })
    return backfillDays
  }, [getDayInFirstWeek, getDaysInMonth])

  const forwardfillDays = useCallback((month: number, year: number) => {
    const lastWeekday = getDayInLastWeek(month, year) // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const forwardfillDays = []
    for (let i = 0; i < 6 - lastWeekday; i++) forwardfillDays.push({
      value: i + 1,
      isToday: false,
      isWeekend: (i === 0 || i === 6),
      isCurrentMonth: false
    })
    return forwardfillDays
  }, [getDayInLastWeek])

  const getDays = useCallback((month: number, year: number) => {
    const daysInMonth = getDaysInMonth(month, year)
    const days = []
    for (let i = 1; i <= daysInMonth; i++) days.push({
      value: i,
      isToday: false,
      isWeekend: (i % 7 === 0 || (i + 1) % 7 === 0),
      isCurrentMonth: true
    })
    return days
  }, [getDaysInMonth])

  useEffect(() => {
    const backfill = backfillDays(currentMonth, currentYear)
    const currentMonthDays = getDays(currentMonth, currentYear)
    const forwardfill = forwardfillDays(currentMonth, currentYear)
    const allDays = [...backfill, ...currentMonthDays, ...forwardfill]
    setDays(allDays)
  }, [currentMonth, currentYear, backfillDays, getDays, forwardfillDays, previousMonth, nextMonth])

  return (
    <section
      {...props}
      className={clsx('calendar-days', className)}
      data-current-month={currentMonth}
      data-current-year={currentYear}>
      {days.map((day, index) => (
        <CalendarDay
          key={index}
          day={day.value}
          isToday={day.isToday}
          isSelected={false}
          isWeekend={day.isWeekend}
          isInCurrentMonth={day.isCurrentMonth} />
      ))}
    </section>
  )
}