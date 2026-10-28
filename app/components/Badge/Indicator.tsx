'use client'

import { cloneElement, isValidElement, useId, type FC } from 'react'
import { tv } from 'tailwind-variants'

import { toneSolid } from '../tones'
import type { IndicatorBadgeProps } from './types'

const indicator = tv({
  // A ring in the page's color cuts it out from what it sits on
  base: 'pointer-events-none absolute z-1 inline-grid place-items-center rounded-full font-bold leading-none tabular-nums ring-2 ring-surface',
  variants: {
    kind: {
      count: 'h-[1.15rem] min-w-[1.15rem] px-1 text-[0.65rem]',
      dot: 'size-2.5',
      icon: 'size-[1.15rem] [&>svg]:size-3',
    },
    placement: {
      'top-end': 'top-0 right-0 translate-x-1/3 -translate-y-1/3',
      'bottom-end': 'right-0 bottom-0 translate-x-1/3 translate-y-1/3',
      'top-start': 'top-0 left-0 -translate-x-1/3 -translate-y-1/3',
      'bottom-start': 'bottom-0 left-0 -translate-x-1/3 translate-y-1/3',
    },
    // On a circle the corner is empty space; pull in to the rim (about 15% of the way)
    overlap: { rect: '', circle: '' },
  },
  compoundVariants: [
    { overlap: 'circle', placement: 'top-end', class: 'top-[15%] right-[15%]' },
    { overlap: 'circle', placement: 'bottom-end', class: 'right-[15%] bottom-[15%]' },
    { overlap: 'circle', placement: 'top-start', class: 'top-[15%] left-[15%]' },
    { overlap: 'circle', placement: 'bottom-start', class: 'bottom-[15%] left-[15%]' },
  ],
})

/**
 * A count, dot, or icon pinned to the corner of an icon, avatar, or icon button.
 *
 *   <IndicatorBadge count={unread} label={`${unread} unread`}>
 *     <Button iconOnly variant="ghost" aria-label="Notifications"><Bell aria-hidden /></Button>
 *   </IndicatorBadge>
 *   <IndicatorBadge dot tone="success" label="Online" overlap="circle" placement="bottom-end">
 *     <img className="size-10 rounded-full" … />
 *   </IndicatorBadge>
 *
 * What's drawn is hidden from screen readers; `label` is attached to the element as its
 * description instead, so "99+" is read as "120 unread", and a button keeps its own name.
 */
export const IndicatorBadge: FC<IndicatorBadgeProps> = ({
  children,
  count,
  max = 99,
  showZero = false,
  dot = false,
  icon,
  label,
  tone,
  placement = 'top-end',
  overlap = 'rect',
  className,
}) => {
  const id = useId()
  const kind = icon ? 'icon' : dot ? 'dot' : 'count'
  const shown = kind !== 'count' || (count !== undefined && (count > 0 || showZero))
  const color = toneSolid[tone ?? (icon ? 'success' : 'danger')]

  const existing = isValidElement(children) ? children.props['aria-describedby'] : undefined
  const target =
    shown && isValidElement(children) ? cloneElement(children, { 'aria-describedby': [existing, id].filter(Boolean).join(' ') }) : children

  return (
    <span className={`relative inline-flex shrink-0 align-middle ${className ?? ''}`}>
      {target}
      {shown ? (
        <>
          <span aria-hidden className={indicator({ kind, placement, overlap, className: color })}>
            {kind === 'icon' ? icon : kind === 'count' && count !== undefined ? (count > max ? `${max}+` : count) : null}
          </span>
          <span id={id} className="sr-only">
            {label}
          </span>
        </>
      ) : null}
    </span>
  )
}
