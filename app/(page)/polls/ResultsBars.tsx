import { Check } from 'lucide-react'
import type { FC } from 'react'

import { cn } from '@/lib/cn'
import type { PollQuestion, PollResults } from '@/lib/content/types'

/**
 * How a poll was answered: under each question, a bar per option with how many picked it.
 * With `correct` (a quiz), the right answer is marked; with `picked`, so is the reader's own.
 */
export const ResultsBars: FC<{ questions: readonly PollQuestion[]; results: PollResults; correct?: Record<string, string>; picked?: Record<string, string> }> = ({ questions, results, correct, picked }) => (
  <ol className="m-0 flex list-none flex-col gap-5 p-0">
    {questions.map((q) => {
      const counts = results.counts[q.id] ?? {}
      const total = q.options.reduce((sum, o) => sum + (counts[o] ?? 0), 0)
      return (
        <li key={q.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 shadow-card">
          <h3 className="m-0 text-[1.02rem] font-bold text-ink">{q.text}</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {q.options.map((o) => {
              const n = counts[o] ?? 0
              const share = total ? Math.round((n / total) * 100) : 0
              const right = correct?.[q.id] === o
              return (
                <li key={o} className="flex flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-3 text-[0.9rem]">
                    <span className={cn('flex min-w-0 items-center gap-1.5 text-ink', (right || picked?.[q.id] === o) && 'font-semibold')}>
                      {right ? <Check size={15} aria-label="The right answer" className="shrink-0 text-success" /> : null}
                      <span className="[overflow-wrap:anywhere]">{o}</span>
                      {picked?.[q.id] === o ? <span className="shrink-0 text-[0.78rem] font-normal text-muted">(your answer)</span> : null}
                    </span>
                    <span className="shrink-0 text-muted tabular-nums">
                      {n} · {share}%
                    </span>
                  </span>
                  <span aria-hidden className="h-2 overflow-hidden rounded-full bg-fill">
                    <span className={cn('block h-full rounded-full', right ? 'bg-success' : 'bg-brand')} style={{ width: `${share}%` }} />
                  </span>
                </li>
              )
            })}
          </ul>
        </li>
      )
    })}
  </ol>
)
