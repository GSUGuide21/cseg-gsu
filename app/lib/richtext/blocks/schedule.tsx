import type { FC } from 'react'

import { InlineText, listOf, textOf } from './inline'

/** A day's plan, top to bottom: each item a time, what happens, and a line about it */

export interface ScheduleItem {
  /** As written: "5:00 PM", "Noon", "Day 2" */
  time: string
  title: string
  text: string
}

export const SCHEDULE_MAX = 20
export const SCHEDULE_TIME_MAX = 24
export const SCHEDULE_TITLE_MAX = 120
export const SCHEDULE_TEXT_MAX = 400

export const parseScheduleItems = (value: unknown): ScheduleItem[] =>
  listOf(value, SCHEDULE_MAX, (raw) => {
    const title = textOf(raw.title, SCHEDULE_TITLE_MAX)
    return title ? { time: textOf(raw.time, SCHEDULE_TIME_MAX), title, text: textOf(raw.text, SCHEDULE_TEXT_MAX, true) } : null
  })

export const scheduleText = (s: ScheduleItem) => [[s.time, s.title].filter(Boolean).join(' '), s.text].filter(Boolean).join('\n')

export const ScheduleList: FC<{ items: ScheduleItem[] }> = ({ items }) => (
  <ol className="my-6 flex list-none flex-col p-0">
    {items.map((s, i) => (
      <li key={i} className="m-0 grid grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)] gap-x-5 border-t border-line py-3.5 first:border-t-0 sm:grid-cols-[7rem_minmax(0,1fr)]">
        <span className="pt-0.5 text-[0.9rem] font-bold text-brand tabular-nums">{s.time}</span>
        <div className="flex flex-col gap-1">
          <span className="font-bold text-ink">{s.title}</span>
          {s.text ? (
            <span className="leading-relaxed text-muted">
              <InlineText text={s.text} />
            </span>
          ) : null}
        </div>
      </li>
    ))}
  </ol>
)
