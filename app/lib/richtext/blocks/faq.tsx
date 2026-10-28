import { ChevronDown } from 'lucide-react'
import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { InlineText, listOf, textOf } from './inline'

/**
 * Questions that open to their answers, as on /about ("Common questions"). In the editor
 * the questions and answers are typed in place (an answer can hold paragraphs, lists,
 * links); the classes here draw them the same way there and on the site.
 */

export const faqClasses = {
  list: 'my-5 flex flex-col gap-3',
  /** One question and its answer, on the site: a <details> that tints when open */
  item: cn(
    'group rounded-xl border border-line bg-surface transition-colors duration-200',
    'open:border-brand-edge open:bg-brand-wash',
    'details-content:h-0 details-content:overflow-clip details-content:transition-[height,content-visibility] details-content:duration-300 details-content:ease-out details-content:transition-discrete',
    'open:details-content:h-auto motion-reduce:details-content:transition-none'
  ),
  /** The same, in the editor, where every answer shows */
  itemOpen: 'rounded-xl border border-line bg-surface',
  summary:
    'flex cursor-pointer list-none items-center gap-4 rounded-xl px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden',
  questionRow: 'flex items-center gap-4 px-5 py-4',
  question: 'min-w-0 flex-1 font-bold text-ink',
  chevron: 'grid size-8 shrink-0 place-items-center rounded-full border border-line text-muted',
  chevronOpen: cn(
    'transition-[transform,background-color,border-color,color] duration-200 motion-reduce:transition-none',
    'group-open:rotate-180 group-open:border-brand-solid group-open:bg-brand-solid group-open:text-white'
  ),
  answer: 'max-w-2xl px-5 pb-5 leading-[1.7] text-muted [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
}

/** The chevron at the end of a question */
export const FaqChevron: FC<{ open?: boolean }> = ({ open = false }) => (
  <span className={cn(faqClasses.chevron, open && faqClasses.chevronOpen)} aria-hidden>
    <ChevronDown size={16} strokeWidth={2.25} />
  </span>
)

/** One question as a native <details> (keyboard and screen readers for free); `group` lets one open at a time */
export const FaqItem: FC<{ question: ReactNode; children: ReactNode; group?: string }> = ({ question, children, group }) => (
  <details name={group} className={faqClasses.item}>
    <summary className={faqClasses.summary}>
      <span className={cn(faqClasses.question, 'transition-colors group-hover:text-brand')}>{question}</span>
      <FaqChevron open />
    </summary>
    <div className={faqClasses.answer}>{children}</div>
  </details>
)

// ── FAQs saved as data (before they were typed in place) ─────────────────────

export interface FaqEntry {
  q: string
  a: string
}

export const FAQ_MAX = 20
export const FAQ_Q_MAX = 200
export const FAQ_A_MAX = 2000

export const parseFaq = (value: unknown): FaqEntry[] =>
  listOf(value, FAQ_MAX, (raw) => {
    const q = textOf(raw.q, FAQ_Q_MAX)
    return q ? { q, a: textOf(raw.a, FAQ_A_MAX, true) } : null
  })

/** An FAQ saved as data: its answers are short text, where **bold** and [links](…) work */
export const FaqList: FC<{ items: FaqEntry[]; group?: string }> = ({ items, group }) => (
  <div className={faqClasses.list}>
    {items.map(({ q, a }, i) => (
      <FaqItem key={i} question={q} group={group}>
        <p className="m-0">
          <InlineText text={a} />
        </p>
      </FaqItem>
    ))}
  </div>
)
