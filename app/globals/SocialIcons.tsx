import { GraduationCap } from 'lucide-react'
import type { ComponentType, FC } from 'react'
import { FaInstagram, FaXTwitter } from 'react-icons/fa6'

import { SOCIAL_LINKS, type SocialNetwork } from '@/globals/config/social'
import { iconButton } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

export const SOCIAL_META: Record<SocialNetwork, { label: string; Icon: ComponentType<{ className?: string }> }> = {
  instagram: { label: 'Instagram', Icon: FaInstagram },
  x: { label: 'X (Twitter)', Icon: FaXTwitter },
  pin: { label: 'PIN', Icon: GraduationCap },
}

/** Row of square social buttons, skipping networks without a link. */
export const SocialIcons: FC<{ size?: 'md' | 'lg'; className?: string }> = ({ size = 'md', className }) => (
  <ul className={cn('flex flex-wrap gap-2', className)} aria-label="Social links">
    {(Object.keys(SOCIAL_LINKS) as SocialNetwork[])
      .filter((network) => SOCIAL_LINKS[network])
      .map((network) => {
        const { label, Icon } = SOCIAL_META[network]
        return (
          <li key={network}>
            <a
              href={SOCIAL_LINKS[network]}
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
