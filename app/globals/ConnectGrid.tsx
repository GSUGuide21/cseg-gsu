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
        'm-0 grid w-full list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]',
        // Phones: an odd last tile spans the row instead of sitting alone
        'max-sm:[&>li:last-child:nth-child(odd)]:col-span-full',
        className
      )}
      aria-label="Ways to connect"
    >
      {tiles.map(({ key, href, label, detail, Icon, external }) => (
        <li key={key} className="h-full">
          <a
            href={href}
            className="flex h-full flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-4 text-center text-ink no-underline transition-colors duration-200 hover:border-brand hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            <Icon className="size-7 text-brand" aria-hidden />
            <span className="text-[0.95rem] font-bold">{label}</span>
            <span className="text-[0.8rem] leading-snug break-all text-muted">{detail}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
