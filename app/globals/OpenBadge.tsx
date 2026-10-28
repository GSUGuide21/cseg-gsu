'use client'

import { useEffect, useState, type FC } from 'react'

import { cn } from '@/lib/cn'
import { getOpenStatus, type OpenStatus, type Schedule } from '@/lib/hours'

/**
 * Live "Open · until 7 p.m." / "Closed · opens 8 a.m." badge.
 * Computed in the browser after mount (the page itself is static), then refreshed every minute.
 */
export const OpenBadge: FC<{ schedule: Schedule; className?: string }> = ({ schedule, className }) => {
  const [status, setStatus] = useState<OpenStatus>()

  useEffect(() => {
    const update = () => setStatus(getOpenStatus(schedule))
    update()
    const id = window.setInterval(update, 60_000)
    return () => window.clearInterval(id)
  }, [schedule])

  if (!status) return null
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold',
        status.open
          ? 'bg-[color-mix(in_srgb,#15803d_14%,var(--bg))] text-[#166534] dark:text-[#4ade80]'
          : 'bg-fill text-ink-faint',
        className
      )}
    >
      <span className={cn('size-1.5 rounded-full', status.open ? 'bg-[#16a34a]' : 'bg-ink-faint')} aria-hidden />
      {status.label}
    </span>
  )
}
