import { tv } from 'tailwind-variants'

/** The colors components use to say what kind of thing something is */
export type Tone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger'

/**
 * A soft, tinted surface in a tone: a pale fill, a matching border, and text that stays
 * readable on it (Alerts, Badges, Banners, toasts).
 */
export const toneSurface = tv({
  variants: {
    tone: {
      neutral: 'border-line bg-fill text-ink',
      brand: 'border-brand-edge bg-brand-tint text-ink',
      info: 'border-brand-edge bg-brand-wash text-ink',
      success: 'border-success/35 bg-success/8 text-ink',
      warning: 'border-warning/40 bg-warning/10 text-ink',
      danger: 'border-danger/35 bg-danger/8 text-ink',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

/** Text and icons in a tone (titles, icons, values) */
export const toneText: Record<Tone, string> = {
  neutral: 'text-ink-soft',
  brand: 'text-brand',
  info: 'text-brand',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

/** A solid fill in a tone (progress bars, meter fills, dots) */
export const toneFill: Record<Tone, string> = {
  neutral: 'bg-ink-soft',
  brand: 'bg-brand',
  info: 'bg-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

/** The same, for SVG strokes (rings and gauges) */
export const toneStroke: Record<Tone, string> = {
  neutral: 'stroke-ink-soft',
  brand: 'stroke-brand',
  info: 'stroke-brand',
  success: 'stroke-success',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
}

/** Solid fills behind white text (solid badges, indicator counts); fixed colors, so they read in both themes */
export const toneSolid: Record<Tone, string> = {
  neutral: 'bg-[#475569] text-white',
  brand: 'bg-brand-solid text-white',
  info: 'bg-brand-solid text-white',
  success: 'bg-[#15803d] text-white',
  warning: 'bg-[#a16207] text-white',
  danger: 'bg-[#b91c1c] text-white',
}
