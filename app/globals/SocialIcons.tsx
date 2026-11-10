'use client'

import type { FC } from 'react'

import { useClubDetails } from '@/globals/ClubDetails'
import type { SocialNetwork } from '@/globals/config/social'
import { SOCIAL_META } from '@/globals/config/socialMeta'
import { iconButton } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

/** Row of square social buttons, skipping networks without a link. */
export const SocialIcons: FC<{ size?: 'md' | 'lg'; className?: string }> = ({ size = 'md', className }) => {
  const { links } = useClubDetails()
  return (
  <ul className={cn('flex flex-wrap gap-2', className)} aria-label="Social links">
    {(Object.keys(links) as SocialNetwork[])
      .filter((network) => links[network])
      .map((network) => {
        const { label, Icon } = SOCIAL_META[network]
        return (
          <li key={network}>
            <a
              href={links[network]}
              className={iconButton({ size, className: 'text-[1.1rem] hover:border-brand hover:bg-brand-tint' })}
              aria-label={label}
              title={label}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon className="size-[1.1rem]" aria-hidden />
            </a>
          </li>
        )
      })}
  </ul>
  )
}
