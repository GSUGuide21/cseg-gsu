import { ArrowUpRight, Star } from 'lucide-react'
import Link from 'next/link'
import type { CSSProperties, FC } from 'react'

import { card, eyebrow } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import type { GuidePick, PickItem } from '@/lib/guidePicks'
import { CARD_ICONS } from '@/lib/richtext/blocks'

/**
 * The colors the guides use to tell things apart (a pick from the next, a resource group
 * from the next): the site's chart colors, which already work in light and dark. `accentOf(i)`
 * sets one as --accent; the classes below draw with it.
 */
const ACCENTS = ['var(--series-1)', 'var(--series-3)', 'var(--series-2)', 'var(--series-5)', 'var(--series-4)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)'] as const
export const accentOf = (index: number) => ({ '--accent': ACCENTS[index % ACCENTS.length] }) as CSSProperties
/** An icon's tile in the accent color: a tint of it behind, the color itself on top */
export const accentTile = 'grid size-10 shrink-0 place-items-center rounded-[0.65rem] bg-[color-mix(in_srgb,var(--accent)_14%,var(--bg))] text-(--accent)'

const chip =
  'inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-[0.82rem] font-semibold text-ink-soft no-underline transition-colors hover:border-(--accent) hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

const PickLink: FC<{ item: PickItem }> = ({ item }) =>
  item.external ? (
    <a href={item.href} className={chip} target="_blank" rel="noopener noreferrer">
      <span className="truncate">{item.label}</span>
      <ArrowUpRight size={13} aria-hidden className="shrink-0 opacity-70" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <Link href={item.href} className={chip}>
      <span className="truncate">{item.label}</span>
    </Link>
  )

/**
 * A guide's curated picks: a few short collections, each a card in its own color with what's
 * in it as links. Nothing at all when there are no picks to show.
 */
export const GuidePicks: FC<{ picks: readonly GuidePick[]; label?: string; className?: string }> = ({ picks, label = 'Curated picks', className }) => {
  if (!picks.length) return null
  return (
    <section aria-label={label} className={cn('flex flex-col gap-4', className)}>
      <h2 className={cn(eyebrow, 'flex items-center gap-1.5')}>
        <Star size={14} aria-hidden className="fill-current" />
        {label}
      </h2>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-4 p-0">
        {picks.map((pick, i) => {
          const Icon = CARD_ICONS[pick.icon]?.Icon ?? Star
          return (
            <li key={pick.id} style={accentOf(i)} className={card({ className: 'relative flex flex-col gap-3 overflow-hidden p-5 pt-6' })}>
              {/* The pick's color, along its top edge */}
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-(--accent)" />
              <div className="flex items-start gap-3">
                <span className={accentTile} aria-hidden>
                  <Icon size={20} strokeWidth={2} />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className="text-[1.05rem] leading-snug font-bold text-ink">{pick.title}</h3>
                  {pick.description ? <p className="text-[0.88rem] leading-[1.55] text-muted">{pick.description}</p> : null}
                </div>
              </div>
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {pick.items.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <PickLink item={item} />
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
