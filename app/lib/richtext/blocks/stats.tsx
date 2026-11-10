import type { FC } from 'react'

import { listOf, textOf } from './inline'

/** Big numbers in a row, each with what it counts: "120+ members", "30 events a year" */

export interface Stat {
  value: string
  label: string
}

export const STATS_MAX = 6
export const STAT_VALUE_MAX = 16
export const STAT_LABEL_MAX = 80

export const parseStats = (value: unknown): Stat[] =>
  listOf(value, STATS_MAX, (raw) => {
    const v = textOf(raw.value, STAT_VALUE_MAX)
    const label = textOf(raw.label, STAT_LABEL_MAX)
    return v && label ? { value: v, label } : null
  })

export const statText = (s: Stat) => `${s.value} ${s.label}`

export const StatRow: FC<{ items: Stat[] }> = ({ items }) => (
  <dl className="my-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-x-6 gap-y-5">
    {items.map((s, i) => (
      // The label leads in the markup (read as "Members, 120+"); the number shows on top
      <div key={i} className="flex flex-col-reverse gap-1 border-t-2 border-brand pt-3">
        <dt className="text-[0.9rem] leading-snug text-muted">{s.label}</dt>
        <dd className="m-0 text-[clamp(1.75rem,4vw,2.4rem)] leading-none font-extrabold tracking-tight text-ink tabular-nums">{s.value}</dd>
      </div>
    ))}
  </dl>
)
