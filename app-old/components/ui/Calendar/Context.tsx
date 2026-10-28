'use client'
import React, { 
  createContext, 
  useContext, 
  useState,
  // useEffect,
  useCallback,
  // useRef 
} from 'react'

import {
  getWeekdayName,
  getMonthName,
  getShortMonthName,
  getDate,
  getFullYear,
  getShortYear
} from '@/app-old/lib/datetime'

import { circle } from '@/app-old/lib/util'

export type CalendarContextType = {
  currentDate: Date
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>
  currentDay: number
  setCurrentDay: React.Dispatch<React.SetStateAction<number>>
  currentMonth: number
  setCurrentMonth: React.Dispatch<React.SetStateAction<number>>
  currentYear: number
  setCurrentYear: React.Dispatch<React.SetStateAction<number>>
  currentWeekday: number
  setCurrentWeekday: React.Dispatch<React.SetStateAction<number>>
  // Methods
  getCurrentMonthName: () => string
  getCurrentShortMonthName: () => string
  getCurrentYear: () => string
  getCurrentShortYear: () => string
  getCurrentDate: () => string
  getCurrentWeekdayName: () => string
  // Handlers
  handleDateChange: (date: Date) => void
  handleMonthChange: (month: number) => void
  // Seeking methods
  seekToNextMonth: () => void
  seekToPreviousMonth: () => void
  seekToNextYear: () => void
  seekToPreviousYear: () => void
  seekToToday: () => void
  seekToMonth: (month: number) => void
  seekToYear: (year: number) => void
  seekToDate: (date: Date) => void
}

export const CalendarContext = createContext<CalendarContextType | undefined>(undefined)

export const useCalendar = (): CalendarContextType => {
  const context = useContext(CalendarContext)
  if (!context) throw new Error('useCalendar must be used within a CalendarProvider')
  return context
}

export type CalendarProviderProps = React.HTMLProps<HTMLElement> & {
  initialDate?: Date
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({
  children,
  ...props
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [currentMonth, setCurrentMonth] = useState<number>(currentDate.getMonth())
  const [currentYear, setCurrentYear] = useState<number>(currentDate.getFullYear())
  const [currentDay, setCurrentDay] = useState<number>(currentDate.getDate())
  const [currentWeekday, setCurrentWeekday] = useState<number>(currentDate.getDay())

  console.log(`month: ${currentMonth}, year: ${currentYear}, day: ${currentDay}, weekday: ${currentWeekday}`)

  const getCurrentMonthName = useCallback(() => {
    return getMonthName(currentMonth)
  }, [currentMonth])

  const getCurrentShortMonthName = useCallback(() => {
    return getShortMonthName(currentMonth)
  }, [currentMonth])

  const getCurrentYear = useCallback(() => {
    return getFullYear(currentYear)
  }, [currentYear])

  const getCurrentShortYear = useCallback(() => {
    return getShortYear(currentYear)
  }, [currentYear])

  const getCurrentDate = useCallback(() => {
    return getDate(currentDay)
  }, [currentDay])

  const getCurrentWeekdayName = useCallback(() => {
    return getWeekdayName(currentWeekday)
  }, [currentWeekday])

  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date)
    setCurrentDay(date.getDate())
    setCurrentMonth(date.getMonth())
    setCurrentYear(date.getFullYear())
    setCurrentWeekday(date.getDay())
  }, [])

  const handleMonthChange = useCallback((month: number) => {
    setCurrentMonth(month)
  }, [])

  const seekToNextMonth = useCallback(() => {
    setCurrentMonth(prev => circle(prev + 1, 0, 12))
    console.log('currentMonth', currentMonth)
    if (currentMonth >= 11) setCurrentYear(prev => prev + 1)
  }, [currentMonth])

  const seekToPreviousMonth = useCallback(() => {
    setCurrentMonth(prev => circle(prev - 1, 0, 12))
    console.log('currentMonth', currentMonth)
    if (currentMonth <= 0) setCurrentYear(prev => prev - 1)
  }, [currentMonth])

  const seekToNextYear = useCallback(() => {
    setCurrentYear(prev => prev + 1)
  }, [])

  const seekToPreviousYear = useCallback(() => {
    setCurrentYear(prev => prev - 1)
  }, [])

  const seekToToday = useCallback(() => {
    const today = new Date()
    setCurrentDate(today)
    setCurrentDay(today.getDate())
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setCurrentWeekday(today.getDay())
  }, [])

  const seekToMonth = useCallback((month: number) => {
    const date = new Date(currentYear, month, currentDay)
    setCurrentDate(date)
    setCurrentMonth(month)
  }, [currentYear, currentDay])

  const seekToYear = useCallback((year: number) => {
    const date = new Date(year, currentMonth, currentDay)
    setCurrentDate(date)
    setCurrentYear(year)
  }, [currentMonth, currentDay])

  const seekToDate = useCallback((date: Date) => {
    setCurrentDate(date)
    setCurrentDay(date.getDate())
    setCurrentMonth(date.getMonth())
    setCurrentYear(date.getFullYear())
  }, [])

  return (
    <CalendarContext.Provider
      {...props}
      value={{
        currentDate,
        setCurrentDate,
        currentMonth,
        setCurrentMonth,
        currentYear,
        setCurrentYear,
        currentDay,
        setCurrentDay,
        currentWeekday,
        setCurrentWeekday,
        getCurrentMonthName,
        getCurrentShortMonthName,
        getCurrentYear,
        getCurrentShortYear,
        getCurrentDate,
        getCurrentWeekdayName,
        handleDateChange,
        handleMonthChange,
        seekToNextMonth,
        seekToPreviousMonth,
        seekToNextYear,
        seekToPreviousYear,
        seekToToday,
        seekToMonth,
        seekToYear,
        seekToDate
      }}>
      {children}
    </CalendarContext.Provider>
  )
}