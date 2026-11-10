import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties, FC } from 'react'

import { SITE_LOGO_BOTTOM_TEXT, SITE_LOGO_TOP_TEXT, SITE_NAME } from '@/globals/config/site'
import { cn } from '@/lib/cn'

export type LogoMarkProps = {
  /** Rendered size in px */
  size?: number
  className?: string
  priority?: boolean
  alt?: string
}

/** Round CSEG seal. Clipped to a circle so the square image's light backing doesn't show in dark mode. */
export const LogoMark: FC<LogoMarkProps> = ({ size = 44, className, priority, alt = '' }) => (
  <Image
    src="/assets/logos/logo-wbl.png"
    alt={alt}
    width={size}
    height={size}
    priority={priority}
    className={cn('block shrink-0 rounded-full bg-white ring-1 ring-line', className)}
  />
)

/**
 * Font size of the bold line; the script line is sized and overlapped in em from it, so every size
 * has the same proportions. Both lines together come to about 2× this, so the text stands as tall as the mark.
 * `mark` is the image's pixel size; `markClass` overrides how big it shows, here in em so it scales with the text.
 */
const WORDMARK_SIZES = {
  md: { mark: 44, gap: 'gap-2.5', text: 'text-lg sm:text-[1.3rem]', markClass: '' },
  lg: { mark: 48, gap: 'gap-3', text: 'text-[1.55rem]', markClass: '' },
  /** Hero: about 12.5em wide in all, so 6.5vw fits a 360px phone */
  xl: {
    mark: 128,
    gap: 'gap-[0.5em]',
    text: 'text-[clamp(1.5rem,6.5vw,3rem)]',
    markClass: 'size-[2.1em] shadow-[0_18px_50px_color-mix(in_srgb,var(--brand)_25%,transparent)]',
  },
} as const

/** Another organization's wordmark (an affiliate's): its name, its two lines, and its seal */
export type WordmarkBrand = {
  name: string
  top: string
  bottom: string
  /** A square logo, shown round; without one, the seal is its initials */
  logoSrc?: string
}

/** An organization's seal, the size of CSEG's: its logo, or the first letters of its two lines */
const BrandMark: FC<{ brand: WordmarkBrand; size: number; className?: string; priority?: boolean }> = ({ brand, size, className, priority }) =>
  brand.logoSrc ? (
    <Image
      src={brand.logoSrc}
      alt=""
      width={size}
      height={size}
      priority={priority}
      // A logo uploaded in the dashboard lives in Storage, which the image optimizer isn't set up for
      unoptimized={/^https?:\/\//.test(brand.logoSrc)}
      className={cn('block shrink-0 rounded-full bg-white object-cover ring-1 ring-line', className)}
    />
  ) : (
    <span
      style={{ '--seal': `${size}px` } as CSSProperties}
      className={cn('grid size-(--seal) shrink-0 place-items-center rounded-full bg-brand-tint text-[0.75em] font-extrabold text-brand ring-1 ring-line', className)}
    >
      {`${brand.top[0]}${brand.bottom.replace(/^\W+/, '')[0] ?? ''}`.toUpperCase()}
    </span>
  )

export type WordmarkProps = {
  size?: keyof typeof WORDMARK_SIZES
  /** Where it links; null for a plain image, e.g. on the homepage itself */
  href?: string | null
  priority?: boolean
  className?: string
  /** On the two lines of text, e.g. to hide them visually on narrow screens */
  textClassName?: string
  /** Another organization's, in CSEG's style; CSEG's own (linking home) without one */
  brand?: WordmarkBrand
}

/**
 * The seal beside the club name, linking home. The script line overlaps the bold line by a
 * negative margin rather than absolute positioning, so the wider of the two sets the width.
 */
export const Wordmark: FC<WordmarkProps> = ({ size = 'md', href = '/', priority, className, textClassName, brand }) => {
  const s = WORDMARK_SIZES[size]
  const content = (
    <>
      {brand ? <BrandMark brand={brand} size={s.mark} priority={priority} className={s.markClass} /> : <LogoMark size={s.mark} priority={priority} className={s.markClass} />}
      <span className={cn('flex flex-col items-end whitespace-nowrap leading-tight', textClassName)} aria-hidden>
        <span className="font-extrabold tracking-tight uppercase">{brand?.top ?? SITE_LOGO_TOP_TEXT}</span>
        <span className="yellowtail logo-shadow mt-[-0.9em] text-[0.84em] text-muted transition-colors group-hover:text-brand">
          {brand?.bottom ?? SITE_LOGO_BOTTOM_TEXT}
        </span>
      </span>
    </>
  )
  const base = cn('inline-flex items-center text-ink', s.gap, s.text, className)
  const name = brand?.name ?? SITE_NAME

  return href === null ? (
    <div role="img" aria-label={name} className={base}>
      {content}
    </div>
  ) : (
    <Link
      href={href}
      aria-label={brand ? name : `${SITE_NAME} home`}
      className={cn('group no-underline transition-colors hover:text-brand', base)}
    >
      {content}
    </Link>
  )
}
