import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { FC, ReactNode } from 'react'

import type { SearchKind } from '@/components'
import { CardBody, cardOf, columns, frame, isExternal, layoutOf } from '@/components/SearchOverlay/Layouts'
import { cn } from '@/lib/cn'
import type { SearchResult } from '@/lib/search'

export interface ResultGroup {
  kind: string
  results: SearchResult[]
  /** How many of this kind matched in all */
  total: number
  /** The page with all of them, when they're cut off */
  moreHref?: string
}

/**
 * Results under headings for their kinds, each kind laid out its own way (see SearchKind's
 * `layout`), or, as a list, every result a row with more of its words.
 */
export const ResultGroups: FC<{
  groups: readonly ResultGroup[]
  words: readonly string[]
  kinds: Readonly<Record<string, SearchKind>>
  icons: Readonly<Record<string, ReactNode>>
  view: 'grid' | 'list'
}> = ({ groups, words, kinds, icons, view }) => {
  const now = Date.now()
  return (
    <div className="flex flex-col">
      {groups.map((g, i) => {
        const layout = layoutOf(kinds, g.kind, view === 'list')
        const id = `results-${i}`
        return (
          <section key={g.kind} aria-labelledby={id} className="flex flex-col gap-3.5 border-t border-line py-6 first:border-t-0 first:pt-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={id} className="m-0 text-[1.15rem] font-bold text-ink">
                {kinds[g.kind]?.label ?? g.kind} <span className="text-[0.85rem] font-medium text-ink-faint">{g.total}</span>
              </h2>
              {g.moreHref ? (
                <Link href={g.moreHref} className="inline-flex items-center gap-1 text-[0.85rem] font-semibold text-brand no-underline hover:underline">
                  See all {g.total} <ArrowRight size={14} aria-hidden />
                </Link>
              ) : null}
            </div>
            <ul className={cn('m-0 grid list-none p-0', columns[layout])}>
              {g.results.map((r) => (
                <li key={r.href + r.title} className="min-w-0">
                  {r.href.startsWith('/') ? (
                    <Link href={r.href} className={frame[layout]}>
                      <CardBody card={cardOf(r)} layout={layout} words={words} kinds={kinds} icons={icons} now={now} />
                    </Link>
                  ) : (
                    // Another site's opens in a new tab; an email address, in the mail app
                    <a href={r.href} {...(isExternal(r.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={frame[layout]}>
                      <CardBody card={cardOf(r)} layout={layout} words={words} kinds={kinds} icons={icons} now={now} />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
