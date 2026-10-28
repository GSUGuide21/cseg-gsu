'use client'

import { CornerDownLeft, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState, type FC, type KeyboardEvent } from 'react'

import { cn } from '@/lib/cn'

import { useControllable } from '../Form/useControllable'
import { Kbd } from '../Kbd'
import { useModalDialog } from '../useModalDialog'
import type { Command, CommandPaletteProps } from './types'

/** How well a command matches: lower is better, null is no match */
const score = (c: Command, q: string) => {
  if (!q) return 0
  const label = c.label.toLowerCase()
  if (label.startsWith(q)) return 0
  if (label.split(/[\s/–-]+/).some((w) => w.startsWith(q))) return 1
  if (label.includes(q)) return 2
  if (c.keywords?.some((k) => k.toLowerCase().startsWith(q)) || c.group?.toLowerCase().startsWith(q)) return 3
  if (c.description?.toLowerCase().includes(q)) return 4
  return null
}

const isApple = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)

/**
 * Search everything and jump there from the keyboard: ⌘K (Ctrl+K) anywhere opens it.
 *
 *   <CommandPalette commands={[
 *     { id: 'members', label: 'Members', group: 'Go to', href: '/dashboard/members', keywords: ['people'] },
 *     { id: 'new-event', label: 'Create an event', group: 'Actions', onSelect: openNewEvent },
 *   ]} />
 *
 * The WAI-ARIA combobox pattern: typing filters the list, ↑ and ↓ move through it (focus
 * stays in the box), Enter runs the highlighted command, Escape closes.
 */
export const CommandPalette: FC<CommandPaletteProps> = ({
  commands,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  hotkey = ['mod', 'K'],
  placeholder = 'Search or jump to…',
  trigger = true,
  emptyText = 'No results',
  className,
}) => {
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDialogElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const id = useId()
  useModalDialog(ref, open)

  // The hotkey, anywhere on the page
  const hotkeyId = hotkey ? hotkey.join('+') : ''
  useEffect(() => {
    if (!hotkey) return
    const keys = hotkey.map((k) => k.toLowerCase())
    const onKey = (e: globalThis.KeyboardEvent) => {
      const mod = isApple() ? e.metaKey : e.ctrlKey
      const wantMod = keys.includes('mod')
      const key = keys.find((k) => !['mod', 'shift', 'alt'].includes(k))
      if (wantMod !== mod || keys.includes('shift') !== e.shiftKey || keys.includes('alt') !== e.altKey) return
      if (e.key.toLowerCase() !== key) return
      e.preventDefault()
      setOpen(!open)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // hotkeyId stands in for the array, which is new on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotkeyId, open, setOpen])

  // A fresh start each time it opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    const matched = commands
      .map((c, i) => ({ c, i, s: score(c, q) }))
      .filter((r): r is { c: Command; i: number; s: number } => r.s !== null && !r.c.disabled)
    // Groups in the order they first appear; best matches first within each
    const order = [...new Set(commands.map((c) => c.group ?? ''))]
    return matched.sort((a, b) => order.indexOf(a.c.group ?? '') - order.indexOf(b.c.group ?? '') || a.s - b.s || a.i - b.i).map((r) => r.c)
  }, [commands, q])
  const current = Math.min(active, Math.max(0, results.length - 1))

  // Keep the highlighted row in view
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${current}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [current])

  const run = (c: Command) => {
    setOpen(false)
    if (c.href) {
      if (/^https?:/.test(c.href)) window.location.assign(c.href)
      else router.push(c.href)
    }
    c.onSelect?.()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') setActive(results.length ? (current + 1) % results.length : 0)
    else if (e.key === 'ArrowUp') setActive(results.length ? (current - 1 + results.length) % results.length : 0)
    else if (e.key === 'Home' && e.ctrlKey) setActive(0)
    else if (e.key === 'End' && e.ctrlKey) setActive(results.length - 1)
    else if (e.key === 'Enter') {
      if (results[current]) run(results[current])
    } else return
    e.preventDefault()
  }

  let lastGroup: string | undefined

  return (
    <>
      {trigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={cn(
            'inline-flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface pr-1.5 pl-3 text-[0.88rem] text-muted transition-colors hover:border-brand-edge hover:text-ink-soft focus-visible:outline-2 focus-visible:outline-brand',
            className
          )}
        >
          <Search size={15} aria-hidden className="shrink-0" />
          <span className="flex-1 truncate text-left">Search…</span>
          {hotkey ? <Kbd keys={hotkey} size="sm" className="max-sm:hidden" /> : null}
        </button>
      ) : null}

      <dialog
        ref={ref}
        aria-label="Command palette"
        onCancel={(e) => {
          e.preventDefault()
          setOpen(false)
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false)
        }}
        className={cn(
          'mx-auto mt-[min(12vh,6rem)] hidden open:flex max-h-[min(32rem,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_64px_rgb(0_0_0/0.28)]',
          'opacity-0 open:opacity-100 starting:open:opacity-0 transition-[opacity,overlay,display] duration-150 transition-discrete motion-reduce:transition-none',
          'backdrop:bg-black/0 backdrop:transition-[background-color,overlay,display] backdrop:duration-150 backdrop:transition-discrete open:backdrop:bg-black/45 starting:open:backdrop:bg-black/0'
        )}
      >
        {open ? (
          <>
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} aria-hidden className="shrink-0 text-muted" />
              <input
                // A modal <dialog> focuses its first control when it opens
                autoFocus
                type="text"
                role="combobox"
                aria-expanded
                aria-controls={`${id}-list`}
                aria-autocomplete="list"
                aria-activedescendant={results[current] ? `${id}-${results[current].id}` : undefined}
                aria-label={placeholder}
                placeholder={placeholder}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onKeyDown}
                autoComplete="off"
                spellCheck={false}
                className="h-13 min-w-0 flex-1 bg-transparent text-[1rem] text-ink outline-none placeholder:text-muted"
              />
              <Kbd keys="Esc" size="sm" />
            </div>
            <div ref={listRef} id={`${id}-list`} role="listbox" aria-label="Commands" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {results.length === 0 ? (
                <p role="presentation" className="m-0 px-3 py-8 text-center text-[0.9rem] text-muted">
                  {emptyText}
                </p>
              ) : (
                results.map((c, i) => {
                  const heading = c.group && c.group !== lastGroup ? c.group : null
                  lastGroup = c.group
                  const on = i === current
                  return (
                    <div key={c.id} role="presentation">
                      {heading ? (
                        <p role="presentation" className="m-0 px-3 pt-2.5 pb-1 text-[0.7rem] font-bold tracking-wider text-muted uppercase">
                          {heading}
                        </p>
                      ) : null}
                      <div
                        id={`${id}-${c.id}`}
                        role="option"
                        aria-selected={on}
                        data-index={i}
                        // Keep focus in the box; a click just runs it
                        onPointerDown={(e) => e.preventDefault()}
                        onPointerMove={() => !on && setActive(i)}
                        onClick={() => run(c)}
                        className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[0.92rem]', on ? 'bg-brand-tint text-ink' : 'text-ink-soft')}
                      >
                        {c.icon ? <span className={cn('shrink-0 [&>svg]:size-4', on ? 'text-brand' : 'text-muted')}>{c.icon}</span> : null}
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium text-ink">{c.label}</span>
                          {c.description ? <span className="truncate text-[0.8rem] text-muted">{c.description}</span> : null}
                        </span>
                        {c.shortcut ? <Kbd keys={c.shortcut} size="sm" /> : null}
                        {on ? <CornerDownLeft size={14} aria-hidden className="shrink-0 text-muted" /> : null}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="flex items-center gap-4 border-t border-line bg-fill px-4 py-2 text-[0.75rem] text-muted max-sm:hidden" aria-hidden>
              <span className="inline-flex items-center gap-1.5">
                <Kbd keys={['up']} size="sm" />
                <Kbd keys={['down']} size="sm" /> to move
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd keys="enter" size="sm" /> to open
              </span>
            </div>
          </>
        ) : null}
      </dialog>
    </>
  )
}
