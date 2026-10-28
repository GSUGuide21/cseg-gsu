'use client'

import { X } from 'lucide-react'
import { cloneElement, useEffect, useId, useRef, type FC } from 'react'

import { cn } from '@/lib/cn'

import { useControllable } from '../Form/useControllable'
import { useFloating } from '../useFloating'
import type { PopoverProps } from './types'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * A small panel that opens from a button: options, details, a short form.
 *
 *   <Popover trigger={<Button variant="outline">Share</Button>} title="Share this event">…</Popover>
 *
 * It moves focus inside when it opens, and closes on Escape (focus goes back to the
 * button), on a click outside, or when focus leaves it. It sits right after its button in
 * the page, so Tab moves into and out of it in order; fixed positioning keeps it from
 * being clipped.
 */
export const Popover: FC<PopoverProps> = ({
  trigger,
  children,
  title,
  'aria-label': ariaLabel,
  open: openProp,
  onOpenChange,
  side = 'bottom',
  align = 'start',
  className,
}) => {
  const [open, setOpen] = useControllable(openProp, false, onOpenChange)
  const panelId = useId()
  const titleId = useId()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const placed = useFloating(open, anchorRef, panelRef, { side, align, offset: 8 })

  const triggerEl = () => anchorRef.current?.querySelector<HTMLElement>(FOCUSABLE)
  const close = (returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerEl()?.focus()
  }

  // Into the panel once it's placed (it's hidden while being measured, and hidden things
  // can't take focus): its first control, or the panel itself
  useEffect(() => {
    if (!open || !placed.placed) return
    const panel = panelRef.current
    ;(panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus()
  }, [open, placed.placed])

  // A click anywhere else closes it
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !anchorRef.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, setOpen])

  const button = cloneElement(trigger, {
    'aria-expanded': open,
    'aria-haspopup': 'dialog',
    'aria-controls': open ? panelId : undefined,
    onClick: (e: MouseEvent) => {
      ;(trigger.props.onClick as ((e: MouseEvent) => void) | undefined)?.(e)
      setOpen(!open)
    },
  })

  return (
    <span ref={anchorRef} className="inline-flex">
      {button}
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : ariaLabel}
          tabIndex={-1}
          style={placed.style}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              close(true)
            }
          }}
          onBlur={(e) => {
            // Focus moved somewhere outside the panel and its button: done with it
            const next = e.relatedTarget as Node | null
            if (next && !panelRef.current?.contains(next) && !anchorRef.current?.contains(next)) setOpen(false)
          }}
          className={cn(
            'z-40 flex w-max max-w-[min(22rem,calc(100vw-1rem))] flex-col gap-2.5 rounded-xl border border-line bg-surface p-4 text-[0.9rem] text-ink shadow-[0_12px_32px_rgb(0_0_0/0.14)] outline-none',
            'starting:opacity-0 starting:translate-y-1 transition-[opacity,translate] duration-150 motion-reduce:transition-none',
            className
          )}
        >
          {title ? (
            <div className="flex items-start justify-between gap-3">
              <p id={titleId} className="m-0 font-bold text-ink">
                {title}
              </p>
              <button
                type="button"
                onClick={() => close(true)}
                aria-label="Close"
                className="-mt-1 -mr-1.5 grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
              >
                <X size={15} aria-hidden />
              </button>
            </div>
          ) : null}
          <div className="leading-relaxed text-ink-soft">{children}</div>
        </div>
      ) : null}
    </span>
  )
}
