'use client'

import { useSyncExternalStore } from 'react'

/**
 * Whether a media query matches, following changes (rotating a phone, resizing a window).
 * The server and the first render assume it doesn't, so use it for things that only show
 * after an interaction, like a picker's panel.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      if (!window.matchMedia) return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false
  )
}
