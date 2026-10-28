import type { FC } from 'react'

import { InlineText, listOf, textOf } from './inline'

/** Numbered steps, each a title and a line or two, as "How it works" on /join */

export interface Step {
  title: string
  text: string
}

export const STEPS_MAX = 8
export const STEP_TITLE_MAX = 120
export const STEP_TEXT_MAX = 600

export const parseSteps = (value: unknown): Step[] =>
  listOf(value, STEPS_MAX, (raw) => {
    const title = textOf(raw.title, STEP_TITLE_MAX)
    return title ? { title, text: textOf(raw.text, STEP_TEXT_MAX, true) } : null
  })

export const StepList: FC<{ items: Step[] }> = ({ items }) => (
  <ol className="my-5 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-x-6 gap-y-4 p-0">
    {items.map((step, i) => (
      <li key={i} className="m-0 flex flex-col gap-2 border-t-2 border-line pt-4 first:border-brand">
        <span className="text-[0.8rem] font-bold text-brand" aria-hidden>
          Step {i + 1}
        </span>
        <h3 className="m-0 text-[1.05rem] font-bold text-ink">{step.title}</h3>
        {step.text ? (
          <p className="m-0 leading-relaxed text-muted">
            <InlineText text={step.text} />
          </p>
        ) : null}
      </li>
    ))}
  </ol>
)
