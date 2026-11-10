import type { FC } from 'react'

import { CORE_VALUES } from '@/globals/config/club'
import { cn } from '@/lib/cn'

/** The word the values' first letters spell */
const word = CORE_VALUES.map((v) => v.title[0]).join('')

/**
 * The core values as the word they spell, down a column: the letters stack in one tinted
 * strip on the left and read C·A·M·P·U·S top to bottom, each value's name and words in the
 * row beside its letter. On wide screens the name and words sit side by side in the row.
 * The letters are drawn, not read: a screen reader hears that the values spell the word,
 * then each value in turn.
 */
export const CoreValues: FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex flex-col gap-4', className)}>
    <p className="sr-only">
      Six values whose first letters spell {word}.
    </p>
    <ol className="m-0 list-none divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface p-0">
      {CORE_VALUES.map(({ title, body }) => (
        <li key={title} className="group grid grid-cols-[4rem_minmax(0,1fr)] sm:grid-cols-[5.5rem_minmax(0,1fr)]">
          {/* The letter: the word's, in order, so the strip spells it */}
          <span
            aria-hidden
            className={cn(
              'grid place-items-center self-stretch bg-brand-tint py-3 text-brand',
              'text-[2.5rem] leading-none font-extrabold tracking-tight sm:text-[3.25rem]',
              'transition-colors duration-200 group-hover:bg-brand-solid group-hover:text-white'
            )}
          >
            {title[0]}
          </span>
          <div className="flex min-w-0 flex-col gap-1 p-4 sm:px-6 sm:py-5 md:grid md:grid-cols-[11rem_minmax(0,1fr)] md:items-baseline md:gap-6">
            <h3 className="m-0 text-[1.05rem] font-bold text-ink">
              {/* The letter it stands for, in the name: Community, with its C marked */}
              <span className="text-brand">{title[0]}</span>
              {title.slice(1)}
            </h3>
            <p className="m-0 text-[0.92rem] leading-relaxed text-muted">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  </div>
)
