'use client'

import { Fragment, useSyncExternalStore, type FC } from 'react'

import { cn } from '@/lib/cn'

import type { KbdProps } from './types'

const noop = () => () => {}
/** Apple keyboards say ⌘ and ⌥. Server and first render say Ctrl, then it settles. */
const useApple = () =>
  useSyncExternalStore(
    noop,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent),
    () => false
  )

/** What each key shows, and what a screen reader hears when that's a symbol */
const keyFace = (key: string, apple: boolean): { face: string; name?: string } => {
  switch (key.toLowerCase()) {
    case 'mod':
      return apple ? { face: '⌘', name: 'Command' } : { face: 'Ctrl' }
    case 'cmd':
    case 'command':
    case 'meta':
      return { face: '⌘', name: 'Command' }
    case 'ctrl':
    case 'control':
      return { face: 'Ctrl' }
    case 'alt':
    case 'option':
      return apple ? { face: '⌥', name: 'Option' } : { face: 'Alt' }
    case 'shift':
      return apple ? { face: '⇧', name: 'Shift' } : { face: 'Shift' }
    case 'enter':
    case 'return':
      return { face: '↵', name: 'Enter' }
    case 'esc':
    case 'escape':
      return { face: 'Esc', name: 'Escape' }
    case 'up':
    case 'arrowup':
      return { face: '↑', name: 'Up arrow' }
    case 'down':
    case 'arrowdown':
      return { face: '↓', name: 'Down arrow' }
    case 'left':
    case 'arrowleft':
      return { face: '←', name: 'Left arrow' }
    case 'right':
    case 'arrowright':
      return { face: '→', name: 'Right arrow' }
    case 'tab':
      return { face: 'Tab' }
    case 'space':
      return { face: 'Space' }
    default:
      return { face: key.length === 1 ? key.toUpperCase() : key }
  }
}

const keycap = {
  sm: 'min-w-5 h-5 px-1 text-[0.68rem]',
  md: 'min-w-6 h-6 px-1.5 text-[0.75rem]',
}

/**
 * A key or shortcut, as keycaps.
 *
 *   Press <Kbd keys="Esc" /> to close.
 *   <Kbd keys={['mod', 'K']} />   →  ⌘ K on a Mac, Ctrl + K elsewhere
 *
 * A combination is a <kbd> of <kbd>s, as HTML describes; symbols like ⌘ are read by name.
 */
export const Kbd: FC<KbdProps> = ({ keys, size = 'md', className }) => {
  const apple = useApple()
  const list = Array.isArray(keys) ? keys : [keys]
  return (
    <kbd className={cn('inline-flex items-center gap-1 align-middle font-sans font-normal whitespace-nowrap', className)}>
      {list.map((key, i) => {
        const { face, name } = keyFace(key, apple)
        return (
          <Fragment key={i}>
            {/* Apple writes shortcuts without the plus: ⌘K */}
            {i > 0 && !apple ? (
              <span className="text-[0.75em] text-muted">+</span>
            ) : null}
            <kbd
              className={cn(
                'inline-grid place-items-center rounded-md border border-line border-b-2 bg-fill font-sans font-semibold leading-none text-ink-soft',
                keycap[size]
              )}
            >
              {name ? (
                <>
                  <span aria-hidden>{face}</span>
                  <span className="sr-only">{name}</span>
                </>
              ) : (
                face
              )}
            </kbd>
          </Fragment>
        )
      })}
    </kbd>
  )
}
