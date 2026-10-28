import { X } from 'lucide-react'
import type { FC } from 'react'
import { tv } from 'tailwind-variants'

import { toneFill, toneSolid, type Tone } from '../tones'
import type { BadgeProps } from './types'

export { IndicatorBadge } from './Indicator'

const badge = tv({
  base: 'inline-flex max-w-full items-center gap-1.5 rounded-full border font-semibold leading-none whitespace-nowrap [&>svg]:shrink-0',
  variants: {
    size: {
      sm: 'px-2 py-0.5 text-[0.7rem] [&>svg]:size-3',
      md: 'px-2.5 py-1 text-[0.78rem] [&>svg]:size-3.5',
    },
    appearance: { soft: '', solid: 'border-transparent', outline: 'bg-transparent' },
    tone: { neutral: '', brand: '', info: '', success: '', warning: '', danger: '' },
    /** Just an icon: a circle around it */
    iconOnly: { true: 'justify-center p-0' },
  },
  compoundVariants: [
    { iconOnly: true, size: 'sm', class: 'size-5' },
    { iconOnly: true, size: 'md', class: 'size-6' },
    { appearance: 'soft', tone: 'neutral', class: 'border-line bg-fill text-ink-soft' },
    { appearance: 'soft', tone: ['brand', 'info'], class: 'border-brand-edge bg-brand-tint text-brand' },
    { appearance: 'soft', tone: 'success', class: 'border-success/30 bg-success/10 text-success' },
    { appearance: 'soft', tone: 'warning', class: 'border-warning/35 bg-warning/12 text-warning' },
    { appearance: 'soft', tone: 'danger', class: 'border-danger/30 bg-danger/10 text-danger' },
    ...(Object.entries(toneSolid) as [Tone, string][]).map(([tone, cls]) => ({ appearance: 'solid' as const, tone, class: cls })),
    { appearance: 'outline', tone: 'neutral', class: 'border-line text-ink-soft' },
    { appearance: 'outline', tone: ['brand', 'info'], class: 'border-brand/50 text-brand' },
    { appearance: 'outline', tone: 'success', class: 'border-success/50 text-success' },
    { appearance: 'outline', tone: 'warning', class: 'border-warning/55 text-warning' },
    { appearance: 'outline', tone: 'danger', class: 'border-danger/50 text-danger' },
  ],
  defaultVariants: { size: 'md', appearance: 'soft', tone: 'neutral' },
})

/**
 * A short label: a status, a category, a count. Or just an icon, named by `label`.
 *
 *   <Badge tone="success" dot>Open</Badge>
 *   <Badge appearance="solid" tone="danger">3</Badge>
 *   <Badge onRemove={() => clear('workshops')}>Workshops</Badge>
 *   <Badge icon={<BadgeCheck aria-hidden />} label="Verified" tone="brand" />
 *
 * To pin a count or dot to the corner of an icon or button, use IndicatorBadge.
 */
export const Badge: FC<BadgeProps> = ({ tone = 'neutral', appearance = 'soft', size = 'md', dot, icon, label, onRemove, className, children }) => {
  const iconOnly = children === undefined && !!icon && !onRemove
  const name = label ?? (typeof children === 'string' ? children : undefined)
  return (
    <span title={label} className={badge({ tone, appearance, size, iconOnly, className: [onRemove && 'pr-1', className] })}>
      {dot ? <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${appearance === 'solid' ? 'bg-white' : toneFill[tone]}`} /> : null}
      {icon}
      {/* With a label, screen readers read it in place of what's shown (the remove button stays reachable) */}
      {children !== undefined ? (
        <span aria-hidden={label ? true : undefined} className="truncate">
          {children}
        </span>
      ) : null}
      {label ? <span className="sr-only">{label}</span> : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={name ? `Remove ${name}` : 'Remove'}
          className="-my-1 grid size-5 cursor-pointer place-items-center rounded-full opacity-70 transition-opacity hover:bg-black/10 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current dark:hover:bg-white/15"
        >
          <X size={12} strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}
    </span>
  )
}
