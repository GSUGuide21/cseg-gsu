import { tv } from 'tailwind-variants'

import { button } from '@/globals/ui/styles'

/**
 * The site's button recipe (globals/ui/styles), plus quieter and destructive variants,
 * square icon-only buttons, full width, and the disabled look.
 */
export const buttonVariants = tv({
  extend: button,
  base: 'disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55',
  variants: {
    variant: {
      /** No border or fill until hovered: toolbars, secondary actions */
      ghost: 'border-transparent text-ink-soft hover:bg-fill hover:text-ink',
      /** A tinted fill: a step down from primary */
      subtle: 'border-transparent bg-brand-tint text-brand hover:bg-brand/18',
      /** For actions that delete or can't be undone. The same red in both themes, behind white text. */
      danger: 'border-transparent bg-[#b91c1c] text-white hover:bg-[#991b1b]',
    },
    iconOnly: { true: '' },
    block: { true: 'w-full' },
  },
  compoundVariants: [
    { iconOnly: true, size: 'sm', class: 'size-9 p-0' },
    { iconOnly: true, size: 'md', class: 'size-11 p-0' },
    { iconOnly: true, size: 'lg', class: 'size-12 p-0' },
  ],
})
