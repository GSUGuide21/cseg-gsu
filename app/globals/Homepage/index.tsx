import Link from 'next/link'
import type { FC, ReactNode } from 'react'

import { Wordmark } from '@/globals/Logo'
import { button, eyebrow } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import type { HomeButton, HomepageContent } from '@/lib/homepage'

import { HeroMedia } from './HeroMedia'

/** A button to a page here, to another site (in a new tab), or to an email or a #section */
const ButtonLink: FC<{ to: HomeButton; className: string }> = ({ to, className }) =>
  to.href.startsWith('/') ? (
    <Link href={to.href} className={className}>
      {to.label}
    </Link>
  ) : /^https?:/i.test(to.href) ? (
    <a href={to.href} className={className} target="_blank" rel="noopener noreferrer">
      {to.label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    // An email or a #section: in place, not a new tab
    <a href={to.href} className={className}>
      {to.label}
    </a>
  )

/** Staggered entrance; opacity stays visible when motion is reduced. */
const fadeIn = 'animate-fade-in opacity-0 motion-reduce:animate-none motion-reduce:opacity-100'

/** Whether the hero has a picture, video, or slideshow behind it that's ready to show */
const hasMedia = ({ media }: HomepageContent['hero']) =>
  (media.kind === 'image' && !!media.image.src) || (media.kind === 'video' && !!media.video.src) || (media.kind === 'slideshow' && media.slides.length > 0)

/**
 * The hero: logo, a line above the title, the title, a subtitle, the description (with its
 * links already made), and its buttons, solid or outlined. Behind them, the brand glow, or a
 * picture, video, or slideshow under a dark wash, with the words in white. `compact` drops its
 * first-screen height, for a preview in a dialog.
 */
export const HomepageHero: FC<{ hero: HomepageContent['hero']; lead: ReactNode; compact?: boolean }> = ({ hero, lead, compact }) => {
  const dark = hasMedia(hero)
  return (
    <section className={cn('relative isolate overflow-hidden', dark && 'text-white')}>
      {dark ? (
        <HeroMedia media={hero.media} />
      ) : (
        <>
          {/* Soft brand glow + dot grid behind the hero */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_50%_-10%,color-mix(in_srgb,var(--brand)_16%,transparent),transparent_70%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(color-mix(in_srgb,var(--fg)_12%,transparent)_1px,transparent_1px)] mask-[linear-gradient(to_bottom,black,transparent_85%)] bg-size-[22px_22px]"
          />
        </>
      )}
      {/* Clicks pass through the space around the words, to a video's or slideshow's controls */}
      <div
        className={cn(
          'pointer-events-none mx-auto flex max-w-5xl flex-col items-center justify-center gap-6 px-4 py-16 text-center *:pointer-events-auto',
          !compact && 'min-h-[calc(100svh-var(--header-height))]',
          dark && 'pb-24'
        )}
      >
        <div className={cn(fadeIn, dark && '**:text-white')}>
          <Wordmark size="xl" href={null} priority />
        </div>
        {hero.eyebrow ? <p className={cn(eyebrow, fadeIn, '[animation-delay:120ms]', dark && 'text-white/85')}>{hero.eyebrow}</p> : null}
        <div className={cn(fadeIn, '[animation-delay:220ms] flex flex-col items-center gap-3')}>
          <h1 className={cn('text-[clamp(2.25rem,7vw,4.75rem)] leading-[1.05] font-extrabold tracking-tight text-balance', dark ? 'text-white [text-shadow:0_2px_24px_rgb(0_0_0/0.35)]' : 'text-ink')}>
            {hero.title}
          </h1>
          {hero.subtitle ? (
            <p className={cn('max-w-3xl text-[clamp(1.15rem,2.6vw,1.6rem)] leading-snug font-semibold text-balance', dark ? 'text-white/90' : 'text-ink-soft')}>{hero.subtitle}</p>
          ) : null}
        </div>
        {hero.lead ? (
          <p
            className={cn(
              fadeIn,
              '[animation-delay:340ms] max-w-2xl text-[clamp(1rem,2vw,1.25rem)] leading-[1.65] text-pretty',
              dark ? 'text-white/85 [&_a]:text-white [&_a]:underline' : 'text-muted'
            )}
          >
            {lead}
          </p>
        ) : null}
        {hero.buttons.length ? (
          <div className={cn(fadeIn, '[animation-delay:460ms] flex flex-wrap justify-center gap-3 max-[600px]:w-full max-[600px]:max-w-80 max-[600px]:flex-col')}>
            {hero.buttons.map((b, i) => (
              <ButtonLink
                key={i}
                to={b}
                className={
                  b.style === 'primary'
                    ? button({ size: 'lg' })
                    : dark
                      ? cn(button({ variant: 'outline', size: 'lg' }), 'border-white text-white hover:border-white hover:bg-white hover:text-ink')
                      : button({ variant: 'outline', size: 'lg' })
                }
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

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
