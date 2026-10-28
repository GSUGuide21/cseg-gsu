import { tv } from 'tailwind-variants'

/**
 * Shared Tailwind recipes for patterns used across many components.
 * Colors come from the theme tokens in app/globals.css (`brand`, `ink`, `muted`, `line`, `surface`).
 */

/** Solid ("primary") and outlined buttons; both carry a 2px border so sizes match. */
export const button = tv({
  base: [
    'inline-flex items-center justify-center gap-2 rounded-lg border-2 font-semibold leading-tight',
    'no-underline transition-colors cursor-pointer',
    'focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand',
  ],
  variants: {
    variant: {
      primary: 'border-transparent bg-brand-solid text-white hover:bg-brand-solid-hover',
      outline: 'border-brand text-brand hover:border-brand-solid hover:bg-brand-solid hover:text-white',
    },
    size: {
      sm: 'px-[calc(1.1rem-2px)] py-[calc(0.6rem-2px)] text-[0.85rem]',
      md: 'px-[calc(1.4rem-2px)] py-[calc(0.75rem-2px)] text-[0.9rem]',
      lg: 'px-[calc(1.6rem-2px)] py-[calc(0.85rem-2px)] text-[0.95rem]',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})

/** Square bordered icon button (header controls, social links). */
export const iconButton = tv({
  base: [
    'inline-flex shrink-0 items-center justify-center rounded-[0.6rem] border border-line bg-transparent text-ink',
    'cursor-pointer transition-colors [-webkit-tap-highlight-color:transparent] touch-manipulation',
    'hover:border-brand/50 hover:text-brand',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
  ],
  variants: {
    size: {
      md: 'size-10',
      lg: 'size-11',
    },
  },
  defaultVariants: { size: 'md' },
})

/** Underlined text link in running copy. */
export const inlineLink = 'text-brand underline underline-offset-[0.15em]'

/** Bordered surface card. */
export const card = tv({
  base: 'rounded-[0.875rem] border border-line bg-surface',
  variants: {
    padded: { true: 'flex flex-col gap-[0.65rem] p-6' },
    /** Blue-tinted highlight treatment (callouts, featured cards) */
    accent: {
      // Gradient (background-image) layered over an opaque wash (background-color)
      true: 'border-brand-edge bg-brand-wash bg-[radial-gradient(circle_at_100%_0%,color-mix(in_srgb,var(--brand)_14%,transparent),transparent_60%)]',
    },
  },
})

/** Subpage container: centered column of header + blocks. */
export const pageShell =
  'mx-auto flex max-w-6xl flex-col gap-[clamp(3rem,6vw,4.5rem)] px-[clamp(1rem,4vw,2rem)] pt-[clamp(2.5rem,6vw,4.5rem)] pb-[clamp(3.5rem,8vw,6rem)]'

/** Two columns on wide screens. */
export const grid2 = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,26rem),1fr))] gap-4'

/** Three columns on wide screens. */
export const grid3 = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4'

/** Body copy inside a card. */
export const cardText = 'text-[0.95rem] leading-[1.65] text-muted'

/** Small rounded square holding an icon. */
export const iconTile = 'grid size-10 shrink-0 place-items-center rounded-[0.65rem] bg-brand-tint text-brand'

/** Small uppercase label above headings. */
export const eyebrow = 'text-[0.75rem] font-bold tracking-[0.14em] uppercase text-brand'
