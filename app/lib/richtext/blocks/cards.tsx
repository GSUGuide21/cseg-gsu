import {
  ArrowUpRight,
  BookOpen,
  Building2,
  Bus,
  CalendarDays,
  Compass,
  Footprints,
  GraduationCap,
  Heart,
  HeartHandshake,
  HeartPulse,
  Info,
  LifeBuoy,
  Lightbulb,
  Mail,
  MapPin,
  MessagesSquare,
  Sparkles,
  Star,
  Users,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { FC } from 'react'

import { card, iconTile } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { safeHref } from '@/lib/safeUrl'

import { InlineText, listOf, textOf } from './inline'

/**
 * Cards: a title, a few words, and optionally an icon and a link (the whole card then
 * opens it), as the resources on /resources and Mission and Purpose on /about. One card
 * stands on its own; several sit in a grid.
 */

/** The icons a card can have, by a name that's saved */
export const CARD_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  info: { label: 'Info', Icon: Info },
  idea: { label: 'Idea', Icon: Lightbulb },
  map: { label: 'Place', Icon: MapPin },
  calendar: { label: 'Date', Icon: CalendarDays },
  people: { label: 'People', Icon: Users },
  chat: { label: 'Chat', Icon: MessagesSquare },
  book: { label: 'Reading', Icon: BookOpen },
  school: { label: 'Classes', Icon: GraduationCap },
  food: { label: 'Food', Icon: Utensils },
  transit: { label: 'Getting around', Icon: Bus },
  heart: { label: 'Wellbeing', Icon: Heart },
  health: { label: 'Health', Icon: HeartPulse },
  support: { label: 'Support', Icon: HeartHandshake },
  help: { label: 'Help', Icon: LifeBuoy },
  money: { label: 'Money', Icon: Wallet },
  building: { label: 'Building', Icon: Building2 },
  compass: { label: 'Finding your way', Icon: Compass },
  steps: { label: 'Steps', Icon: Footprints },
  mail: { label: 'Email', Icon: Mail },
  sparkle: { label: 'Something new', Icon: Sparkles },
  star: { label: 'Highlight', Icon: Star },
}

export interface CardEntry {
  title: string
  text: string
  /** A safe link, or "" for a card that doesn't go anywhere */
  href: string
  /** One of CARD_ICONS, or "" for none */
  icon: string
}

export const CARDS_MAX = 6
export const CARD_TITLE_MAX = 120
export const CARD_TEXT_MAX = 400

export const parseCards = (value: unknown): CardEntry[] =>
  listOf(value, CARDS_MAX, (raw) => {
    const title = textOf(raw.title, CARD_TITLE_MAX)
    if (!title) return null
    const href = typeof raw.href === 'string' && raw.href.trim() ? (safeHref(raw.href) ?? '') : ''
    const icon = typeof raw.icon === 'string' && raw.icon in CARD_ICONS ? raw.icon : ''
    return { title, text: textOf(raw.text, CARD_TEXT_MAX, true), href, icon }
  })

const isExternal = (href: string) => /^https?:/i.test(href)

/** The cards; in the editor (`preview`) a linked card doesn't go anywhere when clicked */
export const CardGrid: FC<{ items: CardEntry[]; preview?: boolean }> = ({ items, preview = false }) => (
  <div className={cn('my-5 grid gap-4', items.length > 1 && 'grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]')}>
    {items.map((c, i) => {
      const Icon = c.icon ? CARD_ICONS[c.icon]?.Icon : undefined
      const linked = !!c.href && !preview
      return (
        <article
          key={i}
          className={card({
            padded: true,
            className: cn('relative', c.href && 'group transition-colors hover:border-brand/55 has-[a:focus-visible]:border-brand'),
          })}
        >
          {Icon || c.href ? (
            <div className="flex items-start justify-between gap-3">
              {Icon ? (
                <span className={iconTile} aria-hidden>
                  <Icon size={20} strokeWidth={2} />
                </span>
              ) : (
                <span />
              )}
              {c.href ? (
                <ArrowUpRight size={18} aria-hidden className="mt-1 shrink-0 text-muted transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" />
              ) : null}
            </div>
          ) : null}
          <h3 className="m-0 text-[1.05rem] leading-snug font-bold text-ink">
            {linked ? (
              // The title's link is stretched over the whole card; links in the text sit above it
              c.href.startsWith('/') ? (
                <Link href={c.href} className="text-ink no-underline outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand">
                  {c.title}
                </Link>
              ) : (
                <a
                  href={c.href}
                  className="text-ink no-underline outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
                  {...(isExternal(c.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {c.title}
                  {isExternal(c.href) ? <span className="sr-only"> (opens in a new tab)</span> : null}
                </a>
              )
            ) : (
              c.title
            )}
          </h3>
          {c.text ? (
            <p className="m-0 text-[0.95rem] leading-[1.65] text-muted [&_a]:relative [&_a]:z-10">
              <InlineText text={c.text} />
            </p>
          ) : null}
        </article>
      )
    })}
  </div>
)
