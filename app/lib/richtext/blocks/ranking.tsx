import type { FC } from 'react'

import { cn } from '@/lib/cn'

import { InlineText, inlinePlain, listOf, textOf } from './inline'

/**
 * A ranking: a numbered countdown of picks, best first ("Top 5 study spots"), each a title,
 * an optional line under it, and a few words on why. The order is the ranking, so it's set
 * in the editor's list (up and down) rather than by a number typed in.
 */

/** Only the title is needed; a pick without a subtitle or description shows without them */
export interface RankingItem {
  title: string
  /** A short line under the title, like where it is or who made it */
  subtitle?: string
  /** Why it's ranked here; **bold** and [links](…) work */
  description?: string
}

export const RANKING_MAX = 10
export const RANKING_MIN = 1

export const RANKING_TITLE_MAX = 150
export const RANKING_SUBTITLE_MAX = 150
export const RANKING_DESCRIPTION_MAX = 600

/** Saved picks, each with its title, and its subtitle and description only when it has them */
export const parseRankings = (value: unknown): RankingItem[] =>
  listOf(value, RANKING_MAX, (raw) => {
    const title = textOf(raw.title, RANKING_TITLE_MAX)
    if (!title) return null
    const subtitle = textOf(raw.subtitle, RANKING_SUBTITLE_MAX)
    const description = textOf(raw.description, RANKING_DESCRIPTION_MAX, true)
    return { title, ...(subtitle ? { subtitle } : {}), ...(description ? { description } : {}) }
  })

/** A pick's words, a line each, for the plain text and the editor's copy */
export const rankingText = ({ title, subtitle, description }: RankingItem) => [title, subtitle, description ? inlinePlain(description) : ''].filter(Boolean).join('\n')

export const RankingList: FC<{ items: RankingItem[] }> = ({ items }) => (
  <ol className="my-5 flex list-none flex-col gap-3 p-0">
    {items.map((item, i) => (
      <li key={i} className={cn('m-0 flex items-start gap-4 rounded-xl border border-line p-4', i === 0 && 'border-brand/50 bg-brand-tint/40')}>
        {/* The rank; the top spot stands out */}
        <span
          aria-hidden
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-full text-[1.15rem] font-extrabold tabular-nums',
            i === 0 ? 'bg-brand-solid text-white' : i < 3 ? 'bg-brand-tint text-brand' : 'bg-fill text-ink-soft'
          )}>
          {i + 1}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="m-0 text-[1.1rem] leading-snug font-bold text-ink">
            <span className="sr-only">Number {i + 1}: </span>
            {item.title}
          </h3>
          {item.subtitle ? <p className="m-0 text-[0.88rem] font-semibold text-brand">{item.subtitle}</p> : null}
          {item.description ? (
            <p className="m-0 leading-relaxed text-muted">
              <InlineText text={item.description} />
            </p>
          ) : null}
        </div>
      </li>
    ))}
  </ol>
)
