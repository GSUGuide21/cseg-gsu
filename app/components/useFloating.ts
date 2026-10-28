'use client'

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'

export type Side = 'top' | 'bottom' | 'left' | 'right'
export type Align = 'start' | 'center' | 'end'

/** Space kept between the floating element and the screen's edges */
const EDGE = 8

const opposite: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }

/**
 * Places an element (a tooltip, a popover) beside an anchor, in fixed position so no
 * scrolling container clips it. It goes on `side`, flips to the other side when there
 * isn't room, and slides along to stay on screen. Follows scrolling and resizing while open.
 */
export function useFloating(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  { side = 'bottom', align = 'center', offset = 8 }: { side?: Side; align?: Align; offset?: number } = {}
) {
  const [place, setPlace] = useState<{ top: number; left: number; side: Side } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const anchor = anchorRef.current?.getBoundingClientRect()
      const floating = floatingRef.current
      if (!anchor || !floating) return
      const { width, height } = floating.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      const vh = document.documentElement.clientHeight
      const room: Record<Side, number> = { top: anchor.top, bottom: vh - anchor.bottom, left: anchor.left, right: vw - anchor.right }
      const need = side === 'top' || side === 'bottom' ? height + offset : width + offset
      const used = room[side] >= need || room[side] >= room[opposite[side]] ? side : opposite[side]
      const vertical = used === 'top' || used === 'bottom'

      const along = (start: number, size: number, own: number) =>
        align === 'start' ? start : align === 'end' ? start + size - own : start + size / 2 - own / 2
      let top = vertical ? (used === 'top' ? anchor.top - offset - height : anchor.bottom + offset) : along(anchor.top, anchor.height, height)
      let left = vertical ? along(anchor.left, anchor.width, width) : used === 'left' ? anchor.left - offset - width : anchor.right + offset
      // Slide along to stay on screen
      left = Math.min(Math.max(left, EDGE), Math.max(EDGE, vw - EDGE - width))
      top = Math.min(Math.max(top, EDGE), Math.max(EDGE, vh - EDGE - height))
      setPlace({ top: Math.round(top), left: Math.round(left), side: used })
    }
    update()
    window.addEventListener('resize', update)
    // Capture: any scrolling container, not just the page
    window.addEventListener('scroll', update, true)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    if (floatingRef.current) observer?.observe(floatingRef.current)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      observer?.disconnect()
    }
  }, [open, anchorRef, floatingRef, side, align, offset])

  const style: CSSProperties = place
    ? { position: 'fixed', top: place.top, left: place.left }
    : // Measured off screen first, then placed
      { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }
  // `placed`: it's visible where it belongs (before that it's hidden, so can't take focus)
  return { style, side: place?.side ?? side, placed: open && place !== null }
}
