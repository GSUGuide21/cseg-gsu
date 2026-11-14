'use client'

import { Mail } from 'lucide-react'
import type { ComponentType, FC } from 'react'

import { useClubDetails } from '@/globals/ClubDetails'
import type { SocialNetwork } from '@/globals/config/social'
import { SOCIAL_META } from '@/globals/config/socialMeta'
import { cn } from '@/lib/cn'

type Tile = { key: string; href: string; label: string; detail: string; Icon: ComponentType<{ className?: string }>; external: boolean }

/**
 * Every way to reach CSEG as a tile: each network with a link (as officers set them
 * in Settings), then the officers' email. A network without a link yet (GroupMe, Discord)
 * stays out until it has one. For the homepage's Connect section.
 */
export const ConnectGrid: FC<{ className?: string }> = ({ className }) => {
  const { links, contactEmail } = useClubDetails()
  const tiles: Tile[] = [
    ...(Object.keys(links) as SocialNetwork[])
      .filter((n) => links[n])
      .map((n) => ({ key: n, href: links[n], ...SOCIAL_META[n], external: true })),
    ...(contactEmail ? [{ key: 'email', href: `mailto:${contactEmail}`, label: 'Email', detail: contactEmail, Icon: Mail, external: false }] : []),
  ]

  return (
    <ul
      className={cn(
        // Wraps as centered rows, so a short last row sits in the middle rather than at the left.
        // Phones: two to a row, and an odd last tile grows to span it instead of sitting alone.
        'm-0 flex w-full list-none flex-wrap justify-center gap-3 p-0',
        className
      )}
      aria-label="Ways to connect"
    >
      {tiles.map(({ key, href, label, detail, Icon, external }) => (
        <li key={key} className="min-w-0 grow basis-[calc(50%-0.375rem)] sm:grow-0 sm:basis-48">
          <a
            href={href}
            className="flex h-full flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-4 text-center text-ink no-underline transition-colors duration-200 hover:border-brand hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            <Icon className="size-7 text-brand" aria-hidden />
            <span className="text-[0.95rem] font-bold text-balance">{label}</span>
            <span className="max-w-full text-[0.8rem] leading-snug text-balance wrap-anywhere text-muted">{detail}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
