'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'

/**
 * Open/close state for a panel that drops down from a control (date and color pickers).
 * Closes on Escape (handing focus back to the trigger) or on a click outside, and opens
 * upward when there's less than `room` px below and more above.
 */
export function usePopover(room = 340) {
  const [open, setOpen] = useState(false)
  const [above, setAbove] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const show = useCallback(() => {
    const box = rootRef.current?.getBoundingClientRect()
    if (box) {
      const below = window.innerHeight - box.bottom
      setAbove(below < room && box.top > below)
    }
    setOpen(true)
  }, [room])

  const hide = useCallback((returnFocus = true) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  /** Put on the root, so Escape anywhere inside closes the panel */
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      e.stopPropagation()
      hide()
    }
  }

  const panelEl = useRef<HTMLElement | null>(null)

  /**
   * Put on the panel. Once open, it slides sideways to stay inside the screen (a panel
   * hangs off one edge of its control, so near the other side of the screen it would run
   * off), then scrolls the page just enough to show all of it. The page's scroll-padding
   * keeps it clear of the fixed site header.
   */
  const panelRef = useCallback((el: HTMLElement | null) => {
    panelEl.current = el
    if (!el) return
    fitToScreen(el)
    el.scrollIntoView?.({ block: 'nearest' })
  }, [])

  // Refit as the window changes size (a phone rotating, a window narrowing)
  useEffect(() => {
    if (!open) return
    const refit = () => panelEl.current && fitToScreen(panelEl.current)
    window.addEventListener('resize', refit)
    return () => window.removeEventListener('resize', refit)
  }, [open])

  return { open, above, rootRef, triggerRef, panelRef, show, hide, toggle: () => (open ? hide() : show()), onKeyDown }
}

/** Space kept between a panel and the screen's side edges */
const EDGE = 8

/**
 * Shifts a panel left or right, if needed, so it sits at least EDGE px inside the screen.
 * A panel wider than the screen lines up with its left side.
 */
function fitToScreen(el: HTMLElement) {
  el.style.translate = ''
  const box = el.getBoundingClientRect()
  const width = document.documentElement.clientWidth
  let shift = 0
  if (box.right > width - EDGE) shift = width - EDGE - box.right
  if (box.left + shift < EDGE) shift = EDGE - box.left
  if (shift) el.style.translate = `${Math.round(shift)}px 0`
}

/** The panel's position under (or over) its control */
export const popoverPlacement = (above: boolean) => (above ? 'bottom-full mb-1.5' : 'top-full mt-1.5')
