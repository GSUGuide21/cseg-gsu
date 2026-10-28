'use client'

import { Moon, Sun } from 'lucide-react'
import { useLayoutEffect, useSyncExternalStore } from 'react'

import { THEME_EVENT, THEME_STORAGE_KEY } from '@/globals/config/theme'
import { iconButton } from '@/globals/ui/styles'

function readIsDark(): boolean {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
  } catch {
    /* private mode / blocked storage */
    return false
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(THEME_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(THEME_EVENT, onStoreChange)
  }
}

export const HeaderThemeToggle = () => {
  const dark = useSyncExternalStore(subscribe, readIsDark, () => false)

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const toggle = () => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, dark ? 'light' : 'dark')
    } catch {
      /* the event below still re-reads; without storage the toggle just won't persist */
    }
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  return (
    <button
      type="button"
      className={iconButton({ className: 'max-lg:size-11' })}
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
    </button>
  )
}
