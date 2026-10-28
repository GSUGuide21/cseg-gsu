'use client'

import { Fragment, type FC } from 'react'

import { cn } from '@/lib/cn'

import { Avatar } from '../Avatar'
import { useHydrated } from '../Portal'
import { toneFill, toneSurface, toneText } from '../tones'
import type { TimelineItem, TimelineProps } from './types'

const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })
const absolute = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86400],
  ['month', 30 * 86400],
  ['week', 7 * 86400],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

/** "just now", "5 minutes ago", "yesterday", "in 2 days" */
export const relativeTime = (date: Date, now = Date.now()) => {
  const seconds = (date.getTime() - now) / 1000
  if (Math.abs(seconds) < 45) return 'just now'
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(Math.round(seconds / 60), 'minute')
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const dayLabel = (d: Date) => {
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (dayKey(d) === dayKey(today)) return 'Today'
  if (dayKey(d) === dayKey(yesterday)) return 'Yesterday'
  return dayName.format(d)
}

const asDate = (t: Date | string | undefined) => (t === undefined ? null : t instanceof Date ? t : new Date(t))

/**
 * What happened, in order: a dashboard's recent activity, an event's history.
 *
 *   <Timeline aria-label="Recent activity" groupByDay items={[
 *     { id: '1', title: 'Jordan RSVP’d to Welcome Week', time: '2026-10-27T14:30:00', avatar: { name: 'Jordan Lee' } },
 *     { id: '2', title: 'Event published', time: …, icon: <Megaphone />, tone: 'brand' },
 *   ]} />
 *
 * Times are written in the reader's own time zone, so they (and the day headings) fill
 * in once the page is running in the browser; each is a <time> with the exact moment.
 */
export const Timeline: FC<TimelineProps> = ({ items, timeFormat = 'relative', groupByDay = false, 'aria-label': ariaLabel, className }) => {
  const hydrated = useHydrated()
  const format = (d: Date) => (typeof timeFormat === 'function' ? timeFormat(d) : timeFormat === 'relative' ? relativeTime(d) : absolute.format(d))

  const row = (item: TimelineItem, last: boolean) => {
    const date = asDate(item.time)
    const tone = item.tone ?? 'neutral'
    return (
      <li key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
        {/* The line down to the next item */}
        {!last ? <span aria-hidden className="absolute top-9 bottom-1 left-[15px] w-0.5 rounded-full bg-line" /> : null}
        <span aria-hidden className="relative z-1 grid size-8 shrink-0 place-items-center">
          {item.avatar ? (
            <Avatar name={item.avatar.name} src={item.avatar.src} size="sm" decorative className="ring-2 ring-surface" />
          ) : item.icon ? (
            <span className={cn(toneSurface({ tone }), 'grid size-8 place-items-center rounded-full border ring-4 ring-surface [&>svg]:size-4', toneText[tone])}>{item.icon}</span>
          ) : (
            <span className={cn('size-2.5 rounded-full ring-4 ring-surface', toneFill[tone])} />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="m-0 text-[0.9rem] font-semibold text-ink">{item.title}</p>
            {date ? (
              <time dateTime={date.toISOString()} title={hydrated ? absolute.format(date) : undefined} className="text-[0.78rem] whitespace-nowrap text-muted">
                {hydrated ? format(date) : ''}
              </time>
            ) : null}
          </div>
          {item.description ? <p className="m-0 text-[0.85rem] text-ink-soft">{item.description}</p> : null}
          {item.content ? <div className="mt-1">{item.content}</div> : null}
        </div>
      </li>
    )
  }

  const list = (rows: TimelineItem[], label?: string) => (
    <ol aria-label={label} className="m-0 list-none p-0">
      {rows.map((item, i) => row(item, i === rows.length - 1))}
    </ol>
  )

  if (!groupByDay || !hydrated) return <div className={className}>{list(items, ariaLabel)}</div>

  // Runs of items from the same day, in the order given
  const groups: { key: string; label: string; items: TimelineItem[] }[] = []
  for (const item of items) {
    const d = asDate(item.time)
    const key = d ? dayKey(d) : 'none'
    const g = groups[groups.length - 1]
    if (g && g.key === key) g.items.push(item)
    else groups.push({ key, label: d ? dayLabel(d) : 'Undated', items: [item] })
  }
  return (
    <section aria-label={ariaLabel} className={cn('flex flex-col gap-4', className)}>
      {groups.map((g, i) => (
        <Fragment key={g.key + i}>
          <h3 className="m-0 text-[0.75rem] font-bold tracking-wider text-muted uppercase">{g.label}</h3>
          {list(g.items, g.label)}
        </Fragment>
      ))}
    </section>
  )
}
