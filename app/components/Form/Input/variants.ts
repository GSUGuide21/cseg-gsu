import { tv } from 'tailwind-variants'

/**
 * The bordered box every text-like control shares (Input, TextArea, Number, Select). The
 * box takes the focus ring, so icons and buttons inside it read as part of one control.
 */
export const control = tv({
  base: [
    'relative flex w-full min-w-0 items-center gap-2 rounded-lg border border-line bg-surface text-ink transition-colors',
    'hover:border-brand/45',
    'focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/20',
  ],
  variants: {
    size: {
      sm: 'min-h-9 px-3 text-[0.85rem]',
      md: 'min-h-11 px-3.5 text-[0.95rem]',
      lg: 'min-h-13 px-4 text-base',
    },
    invalid: {
      true: 'border-danger hover:border-danger focus-within:border-danger focus-within:ring-danger/20',
    },
    disabled: {
      true: 'cursor-not-allowed bg-fill text-ink-soft hover:border-line',
    },
    multiline: {
      true: 'items-start py-2.5',
    },
    // Last, so its taller box and bottom-aligned text win over `size`
    floating: {
      true: 'min-h-14 items-end pb-2',
    },
  },
  compoundVariants: [{ multiline: true, floating: true, class: 'items-start pt-6 pb-2.5' }],
  defaultVariants: { size: 'md' },
})

/** The bare input or textarea inside a `control` box */
export const controlInput =
  'w-full min-w-0 flex-1 border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-ink-faint disabled:cursor-not-allowed'

/** An icon at either end of a `control` box */
export const controlIcon = 'flex shrink-0 items-center text-ink-faint [&>svg]:size-4'

/** A small icon button inside a `control` box (open a calendar, pick a color) */
export const controlButton =
  'grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent'

/** The floating panel under a control: Select and time menus, calendars, color panels */
export const panel =
  // scroll-my keeps a gap when a panel scrolls itself into view (see usePopover's panelRef)
  'absolute z-30 scroll-my-4 rounded-xl border border-line bg-surface shadow-[0_12px_32px_rgb(0_0_0/0.14)]'

/** A scrolling option list inside a `panel` */
export const menuList = 'inset-x-0 max-h-64 overflow-y-auto overscroll-contain p-1'

/** Small text buttons in a picker's footer (Clear, Today, Done) */
export const footerButton =
  'cursor-pointer rounded-md px-2.5 py-1.5 text-[0.8rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40'
