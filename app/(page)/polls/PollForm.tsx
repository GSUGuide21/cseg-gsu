'use client'

import { CircleCheck } from 'lucide-react'
import { useState, useTransition, type FC } from 'react'

import { button, card } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { submitPoll, type PollOutcome } from '@/lib/content/actions'
import type { PollQuestion } from '@/lib/content/types'

import { ResultsBars } from './ResultsBars'

/**
 * Answering a poll or quiz: one option per question, sent once. Afterwards a quiz shows the
 * mark and the right answers, and (when the poll shares them) how everyone answered.
 */
export const PollForm: FC<{ pollId: string; kind: 'poll' | 'quiz'; questions: readonly PollQuestion[] }> = ({ pollId, kind, questions }) => {
  const [pending, start] = useTransition()
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [problem, setProblem] = useState('')
  const [outcome, setOutcome] = useState<Extract<PollOutcome, { ok: true }> | null>(null)

  if (outcome)
    return (
      <div className="flex flex-col gap-5">
        <div role="status" className={card({ accent: true, className: 'flex items-start gap-3 p-5' })}>
          <CircleCheck size={22} aria-hidden className="mt-0.5 shrink-0 text-success" />
          <div className="flex flex-col gap-1">
            <p className="m-0 text-[1.05rem] font-bold text-ink">
              {kind === 'quiz' && outcome.score !== null ? `You got ${outcome.score} of ${questions.length}.` : 'Thanks, your answer is in.'}
            </p>
            {!outcome.results ? <p className="m-0 text-[0.92rem] text-muted">{kind === 'quiz' ? 'The right answers are marked below.' : 'The officers will share how it came out.'}</p> : null}
          </div>
        </div>
        {outcome.results ? (
          <ResultsBars questions={questions} results={outcome.results} correct={outcome.correct ?? undefined} picked={picked} />
        ) : outcome.correct ? (
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {questions.map((q) => (
              <li key={q.id} className={card({ padded: true, className: 'flex flex-col gap-1' })}>
                <span className="font-bold text-ink">{q.text}</span>
                <span className={cn('text-[0.92rem]', picked[q.id] === outcome.correct?.[q.id] ? 'text-success' : 'text-danger')}>
                  You said: {picked[q.id]}
                  {picked[q.id] === outcome.correct?.[q.id] ? ' (right)' : ''}
                </span>
                {picked[q.id] !== outcome.correct?.[q.id] ? <span className="text-[0.92rem] text-ink">The answer: {outcome.correct?.[q.id]}</span> : null}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    )

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        start(async () => {
          setProblem('')
          const result = await submitPoll(pollId, form).catch((): PollOutcome => ({ ok: false, error: 'Your answer didn’t go through.' }))
          if (result.ok) return setOutcome(result)
          setErrors(result.errors ?? {})
          setProblem(result.error ?? (result.errors ? 'Answer every question first.' : ''))
        })
      }}
    >
      {questions.map((q, i) => (
        <fieldset key={q.id} className={card({ padded: true, className: 'm-0 flex min-w-0 flex-col gap-3' })} aria-describedby={errors[q.id] ? `${q.id}-error` : undefined}>
          <legend className="float-left mb-1 w-full p-0 text-[1.05rem] font-bold text-ink">
            <span className="text-muted">{i + 1}.</span> {q.text}
          </legend>
          <div className="flex clear-both flex-col gap-2">
            {q.options.map((o) => (
              <label
                key={o}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-[0.95rem] text-ink transition-colors hover:border-brand-edge has-focus-visible:outline-2 has-focus-visible:outline-brand',
                  picked[q.id] === o ? 'border-brand bg-brand-tint' : 'border-line bg-surface'
                )}
              >
                <input type="radio" name={q.id} value={o} checked={picked[q.id] === o} onChange={() => setPicked((all) => ({ ...all, [q.id]: o }))} className="size-4 shrink-0 accent-[var(--brand)]" />
                <span className="[overflow-wrap:anywhere]">{o}</span>
              </label>
            ))}
          </div>
          {errors[q.id] ? (
            <p id={`${q.id}-error`} className="m-0 text-[0.85rem] font-semibold text-danger">
              {errors[q.id]}
            </p>
          ) : null}
        </fieldset>
      ))}
      {problem ? (
        <p role="alert" className="m-0 text-[0.92rem] font-semibold text-danger">
          {problem}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={button({ className: 'self-start' })}>
        {pending ? 'Sending…' : kind === 'quiz' ? 'See how you did' : 'Send my answer'}
      </button>
    </form>
  )
}
