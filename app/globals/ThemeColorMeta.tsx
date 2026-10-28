'use client'

import { useLayoutEffect, useSyncExternalStore } from 'react'

import { THEME_COLORS } from '@/globals/config/theme'

function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => obs.disconnect()
}

const snapshotDark = () => document.documentElement.classList.contains('dark')

/** Keeps `<meta name="theme-color">` in sync with `.dark` (mobile browser chrome). */
export const ThemeColorMeta = () => {
  const dark = useSyncExternalStore(subscribe, snapshotDark, () => false)

  useLayoutEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light)
  }, [dark])

  return null
}
