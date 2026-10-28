'use client'
import React from 'react'
import clsx from 'clsx'
import { Calendar } from '@/app-old/components/ui/Calendar'

export const CalendarContainer = () => {
  return (
    <div className={clsx('calendar-container')}>
      <Calendar />
    </div>
  )
}