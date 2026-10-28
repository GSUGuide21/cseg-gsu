import { tv } from 'tailwind-variants'

/** A bar's track; the fill inside it takes the tone */
export const progressTrack = tv({
  base: 'relative w-full overflow-hidden rounded-full bg-line',
  variants: {
    size: { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' },
  },
  defaultVariants: { size: 'md' },
})

/** Default reading of an amount: "40%" */
export const percent = (value: number, max: number) => `${Math.round((max > 0 ? value / max : 0) * 100)}%`

/** The ARIA a progressbar needs; amounts are left out while it's unknown */
export const progressAria = (value: number | null | undefined, max: number, text: string | undefined) =>
  value === null || value === undefined
    ? { role: 'progressbar' as const, 'aria-busy': true }
    : { role: 'progressbar' as const, 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': value, 'aria-valuetext': text }
