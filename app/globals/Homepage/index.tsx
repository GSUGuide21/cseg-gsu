import Link from 'next/link'
import type { FC, ReactNode } from 'react'

import { CLUB_DESCRIPTION, HERO, SITE_NAME } from '@/globals/config/site'
import { SOCIAL_LINKS } from '@/globals/config/social'
import { LogoMark } from '@/globals/Logo'
import { button, eyebrow } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

/** Staggered entrance; opacity stays visible when motion is reduced. */
const fadeIn = 'animate-fade-in opacity-0 motion-reduce:animate-none motion-reduce:opacity-100'

export const HomepageHero: FC = () => (
  <section className="relative isolate overflow-hidden">
    {/* Soft brand glow + dot grid behind the hero */}
    <div
      aria-hidden
      className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_50%_-10%,color-mix(in_srgb,var(--brand)_16%,transparent),transparent_70%)]"
    />
    <div
      aria-hidden
      className="absolute inset-0 -z-10 bg-[radial-gradient(color-mix(in_srgb,var(--fg)_12%,transparent)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] bg-size-[22px_22px]"
    />
    <div className="mx-auto flex min-h-[calc(100svh-var(--header-height))] max-w-5xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className={fadeIn}>
        <LogoMark size={168} priority alt={SITE_NAME} className="size-[clamp(7rem,22vw,10.5rem)] shadow-[0_18px_50px_color-mix(in_srgb,var(--brand)_25%,transparent)]" />
      </div>
      <p className={cn(eyebrow, fadeIn, '[animation-delay:120ms]')}>{HERO.eyebrow}</p>
      <h1
        className={cn(
          fadeIn,
          '[animation-delay:220ms] text-[clamp(2.25rem,7vw,4.75rem)] leading-[1.05] font-extrabold tracking-tight text-balance text-ink'
        )}
      >
        {HERO.title}
      </h1>
      <p
        className={cn(
          fadeIn,
          '[animation-delay:340ms] max-w-2xl text-[clamp(1rem,2vw,1.25rem)] leading-[1.65] text-pretty text-muted'
        )}
      >
        {CLUB_DESCRIPTION.tagline} {SITE_NAME} helps you navigate campus, discover underutilized resources, and make it all the way to graduation.
      </p>
      <div className={cn(fadeIn, '[animation-delay:460ms] flex flex-wrap justify-center gap-3 max-[600px]:w-full max-[600px]:max-w-80 max-[600px]:flex-col')}>
        <Link href="/join" className={button({ size: 'lg' })}>
          Join CSEG &rarr;
        </Link>
        <a
          href={SOCIAL_LINKS.instagram}
          className={button({ variant: 'outline', size: 'lg' })}
          target="_blank"
          rel="noopener noreferrer"
        >
          Follow on Instagram
        </a>
      </div>
    </div>
  </section>
)

export type HomepageSectionProps = {
  eyebrow: string
  title: string
  lead?: ReactNode
  children?: ReactNode
  cta?: { href: string; label: string }
  /** Tinted background to alternate with plain sections */
  tinted?: boolean
}

/** Centered homepage section: eyebrow, title, lead, content, and an optional CTA. */
export const HomepageSection: FC<HomepageSectionProps> = ({ eyebrow: label, title, lead, children, cta, tinted }) => (
  <section className={cn('border-t border-line px-4 py-[clamp(4rem,10vw,7rem)]', tinted && 'bg-fill')}>
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 text-center">
      <p className={eyebrow}>{label}</p>
      <h2 className="text-[clamp(1.75rem,4.5vw,2.75rem)] leading-[1.15] font-extrabold tracking-tight text-balance text-ink">
        {title}
      </h2>
      {lead ? (
        <p className="max-w-2xl text-[clamp(1rem,2vw,1.15rem)] leading-[1.65] text-pretty text-muted">{lead}</p>
      ) : null}
      {children}
      {cta ? (
        <Link href={cta.href} className={button({ variant: 'outline' })}>
          {cta.label}
        </Link>
      ) : null}
    </div>
  </section>
)
