'use client'

import { ArrowRight, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { FC } from 'react'

import { useClubDetails } from '@/globals/ClubDetails'
import { cn } from '@/lib/cn'
import type { BannerTone } from '@/lib/supabase/types'

const TONES: Record<BannerTone, { Icon: LucideIcon; className: string }> = {
  info: { Icon: Info, className: 'border-brand-edge bg-brand-tint text-ink [&_svg]:text-brand' },
  success: { Icon: CircleCheck, className: 'border-success/40 bg-success/10 text-ink [&_svg]:text-success' },
  warning: { Icon: TriangleAlert, className: 'border-warning/50 bg-warning/15 text-ink [&_svg]:text-warning' },
}

/**
 * The notice officers set in Settings, across the top of every page under the header: a
 * line of words, linked when it has somewhere to go. Nothing when there's none (or its
 * last day has passed).
 */
export const SiteBanner: FC = () => {
  const { banner } = useClubDetails()
  if (!banner) return null
  const { Icon, className } = TONES[banner.tone] ?? TONES.info
  const body = (
    <>
      <Icon size={17} className="shrink-0" aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">{banner.message}</span>
      {banner.href ? <ArrowRight size={15} className="shrink-0" aria-hidden /> : null}
    </>
  )
  const row = 'mx-auto flex max-w-7xl items-center justify-center gap-2.5 px-[clamp(1rem,5vw,4rem)] py-2.5 text-center text-[0.9rem] font-semibold'
  return (
    <aside aria-label="Notice" className={cn('border-b', className)}>
      {banner.href ? (
        banner.href.startsWith('/') ? (
          <Link href={banner.href} className={cn(row, 'text-inherit no-underline hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand')}>
            {body}
          </Link>
        ) : (
          <a
            href={banner.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(row, 'text-inherit no-underline hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand')}
          >
            {body}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )
      ) : (
        <p className={cn(row, 'm-0')}>{body}</p>
      )}
    </aside>
  )
}
