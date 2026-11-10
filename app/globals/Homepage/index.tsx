import Link from 'next/link'
import type { FC, ReactNode } from 'react'

import { Wordmark } from '@/globals/Logo'
import { button, eyebrow } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import type { HomeButton, HomepageContent } from '@/lib/homepage'

/** A button to a page here, or to another site in a new tab */
const ButtonLink: FC<{ to: HomeButton; className: string }> = ({ to, className }) =>
  to.href.startsWith('/') ? (
    <Link href={to.href} className={className}>
      {to.label}
    </Link>
  ) : (
    <a href={to.href} className={className} target="_blank" rel="noopener noreferrer">
      {to.label}
    </a>
  )

/** Staggered entrance; opacity stays visible when motion is reduced. */
const fadeIn = 'animate-fade-in opacity-0 motion-reduce:animate-none motion-reduce:opacity-100'

/** The hero: logo, eyebrow, title, a line under it (with its links already made), and up to two buttons */
export const HomepageHero: FC<{ hero: HomepageContent['hero']; lead: ReactNode }> = ({ hero, lead }) => (
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
        <Wordmark size="xl" href={null} priority />
      </div>
      <p className={cn(eyebrow, fadeIn, '[animation-delay:120ms]')}>{hero.eyebrow}</p>
      <h1
        className={cn(
          fadeIn,
          '[animation-delay:220ms] text-[clamp(2.25rem,7vw,4.75rem)] leading-[1.05] font-extrabold tracking-tight text-balance text-ink'
        )}
      >
        {hero.title}
      </h1>
      <p
        className={cn(
          fadeIn,
          '[animation-delay:340ms] max-w-2xl text-[clamp(1rem,2vw,1.25rem)] leading-[1.65] text-pretty text-muted'
        )}
      >
        {lead}
      </p>
      <div className={cn(fadeIn, '[animation-delay:460ms] flex flex-wrap justify-center gap-3 max-[600px]:w-full max-[600px]:max-w-80 max-[600px]:flex-col')}>
        <ButtonLink to={hero.primary} className={button({ size: 'lg' })} />
        {hero.secondary ? <ButtonLink to={hero.secondary} className={button({ variant: 'outline', size: 'lg' })} /> : null}
      </div>
    </div>
  </section>
)

export type HomepageSectionProps = {
  eyebrow: string
  title: string
  lead?: ReactNode
  children?: ReactNode
  cta?: HomeButton
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
        <ButtonLink to={cta} className={button({ variant: 'outline' })} />
      ) : null}
    </div>
  </section>
)
