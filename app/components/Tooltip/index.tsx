'use client'

import { cloneElement, useEffect, useId, useRef, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { Portal } from '../Portal'
import { useFloating } from '../useFloating'
import type { TooltipProps } from './types'

/** How long it lingers after the pointer leaves, so it can be moved onto */
const HIDE_MS = 120

/**
 * A short hint shown when the element under it is hovered or focused.
 *
 *   <Tooltip content="Copy link"><Button iconOnly variant="ghost" aria-label="Copy link"><Link2 /></Button></Tooltip>
 *   <Tooltip content="Due 11:59 p.m. Sunday"><Badge>Due soon</Badge></Tooltip>
 *
 * Following WCAG 1.4.13, it stays while the pointer is over it, and Escape hides it
 * without moving the pointer or focus. Touch screens show it on focus (a tap), so don't
 * put anything people need only in a tooltip.
 */
export const Tooltip: FC<TooltipProps> = ({ content, children, role = 'description', side = 'top', delay = 400, className }) => {
  const [open, setOpen] = useState(false)
  const id = useId()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const placed = useFloating(open, anchorRef, tipRef, { side, offset: 8 })

  const later = (next: boolean, ms: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(next), ms)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Escape hides it from anywhere, as WCAG asks of content that appears on hover
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const ownRef = children.props[role === 'label' ? 'aria-labelledby' : 'aria-describedby']
  const trigger = cloneElement(children, {
    [role === 'label' ? 'aria-labelledby' : 'aria-describedby']: [ownRef, id].filter(Boolean).join(' '),
  })

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex"
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') later(true, delay)
        }}
        onPointerLeave={() => later(false, HIDE_MS)}
        onFocus={() => later(true, 0)}
        onBlur={() => later(false, 0)}
      >
        {trigger}
      </span>
      <Portal>
        <div
          ref={tipRef}
          id={id}
          role="tooltip"
          // Always in the page (hidden when closed), so the element's description is there to read
          hidden={!open}
          onPointerEnter={() => window.clearTimeout(timer.current)}
          onPointerLeave={() => later(false, HIDE_MS)}
          style={placed.style}
          data-side={placed.side}
          className={cn(
            'z-50 max-w-64 rounded-md bg-ink px-2.5 py-1.5 text-[0.78rem] leading-snug font-medium text-surface shadow-[0_6px_16px_rgb(0_0_0/0.2)]',
            'starting:opacity-0 transition-opacity duration-150 motion-reduce:transition-none',
            className
          )}
        >
          {content}
        </div>
      </Portal>
    </>
  )
}
