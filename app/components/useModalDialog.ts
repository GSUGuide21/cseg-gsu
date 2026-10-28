'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Opens and closes a <dialog> as a modal to match `open`, and keeps the page behind it
 * from scrolling meanwhile (Dialog, Offcanvas, CommandPalette). Falls back to the `open`
 * attribute where showModal isn't there (jsdom).
 */
export function useModalDialog(ref: RefObject<HTMLDialogElement | null>, open: boolean) {
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [ref, open])

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const before = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = before
    }
  }, [open])
}
