'use client'

import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { cloneElement, Fragment, useEffect, useId, useRef, useState, type FC, type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Button } from '../Button'
import { useControllable } from '../Form/useControllable'
import { Kbd } from '../Kbd'
import { useFloating } from '../useFloating'
import type { ActionGroup, ActionItem, ActionMenuEntry, ActionMenuProps } from './types'

const isGroup = (e: ActionMenuEntry): e is ActionGroup => typeof e === 'object' && 'items' in e

/**
 * A menu of actions from a button: a row's Edit / Duplicate / Delete, an account menu.
 *
 *   <ActionMenu label={`Actions for ${member.name}`} items={[
 *     { label: 'Edit', icon: <Pencil />, onSelect: edit },
 *     { label: 'View profile', href: `/members/${member.id}` },
 *     'separator',
 *     { label: 'Remove', icon: <Trash2 />, danger: true, onSelect: remove },
 *   ]} />
 *
 * The WAI-ARIA menu button pattern: Enter, Space, or ↓ opens it on the first item (↑ on
 * the last); the arrow keys, Home, End, and typing a letter move through it; Escape
 * closes it and returns to the button; Tab closes it and moves on.
 */
export const ActionMenu: FC<ActionMenuProps> = ({
  items,
  trigger,
  label = 'More actions',
  side = 'bottom',
  align = 'end',
  point,
  open: openProp,
  onOpenChange,
  onDismiss,
  className,
}) => {
  const [open, setOpen] = useControllable(openProp, false, onOpenChange)
  const [focusIndex, setFocusIndex] = useState(0)
  const menuId = useId()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const placed = useFloating(open, anchorRef, menuRef, { side, align, offset: 6 })

  // Every item that can be reached, in order, for the arrow keys
  const flat: ActionItem[] = items.flatMap((e) => (e === 'separator' ? [] : isGroup(e) ? e.items : [e]))
  const reachable = flat.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0)

  const triggerEl = () => anchorRef.current?.querySelector<HTMLElement>('[aria-haspopup="menu"]')
  const close = (returnFocus: boolean) => {
    setOpen(false)
    if (point) onDismiss?.(returnFocus)
    else if (returnFocus) triggerEl()?.focus()
  }
  const openAt = (where: 'first' | 'last') => {
    setFocusIndex(where === 'first' ? (reachable[0] ?? 0) : (reachable[reachable.length - 1] ?? 0))
    setOpen(true)
  }

  // Opened at a point (from outside), it starts on the first item
  const pointKey = point ? `${point.x},${point.y}` : ''
  useEffect(() => {
    if (open && pointKey) setFocusIndex(reachable[0] ?? 0)
    // Each time it opens somewhere new; reachable is read as it is then
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pointKey])

  // Focus follows the active item, once the menu is placed (it's hidden while measured)
  useEffect(() => {
    if (!open || !placed.placed) return
    menuRef.current?.querySelector<HTMLElement>(`[data-index="${focusIndex}"]`)?.focus()
  }, [open, placed.placed, focusIndex])

  // A click anywhere else closes it
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !anchorRef.current?.contains(t)) close(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
    // close only reads props that don't change while it's open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const move = (to: number) => reachable.length && setFocusIndex(to)
  const onMenuKeyDown = (e: KeyboardEvent) => {
    const at = reachable.indexOf(focusIndex)
    if (e.key === 'ArrowDown') move(reachable[(at + 1) % reachable.length])
    else if (e.key === 'ArrowUp') move(reachable[(at - 1 + reachable.length) % reachable.length])
    else if (e.key === 'Home') move(reachable[0])
    else if (e.key === 'End') move(reachable[reachable.length - 1])
    else if (e.key === 'Escape') {
      e.stopPropagation()
      close(true)
    } else if (e.key === 'Tab') {
      // Let focus move on, from the button's place in the page (or where the menu was opened)
      if (point) close(true)
      else {
        triggerEl()?.focus()
        setOpen(false)
      }
      return
    } else if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Typeahead: the next item starting with that letter
      const key = e.key.toLowerCase()
      const order = [...reachable.slice(at + 1), ...reachable.slice(0, at + 1)]
      const hit = order.find((i) => flat[i].label.toLowerCase().startsWith(key))
      if (hit !== undefined) move(hit)
    } else return
    e.preventDefault()
  }

  const button = trigger ?? (
    <Button iconOnly variant="ghost" size="sm" aria-label={label}>
      <MoreHorizontal size={18} aria-hidden />
    </Button>
  )
  const triggerProps = button.props as { onClick?: (e: unknown) => void; onKeyDown?: (e: KeyboardEvent) => void }
  const triggerWithMenu = cloneElement(button, {
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: (e: unknown) => {
      triggerProps.onClick?.(e)
      if (open) setOpen(false)
      else openAt('first')
    },
    onKeyDown: (e: KeyboardEvent) => {
      triggerProps.onKeyDown?.(e)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        openAt(e.key === 'ArrowDown' ? 'first' : 'last')
      }
    },
  })

  let index = -1
  const renderItem = (item: ActionItem) => {
    index += 1
    const i = index
    const body: ReactNode = (
      <>
        {item.icon ? <span className={cn('shrink-0 [&>svg]:size-4', item.danger ? 'text-danger' : 'text-ink-soft')}>{item.icon}</span> : null}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{item.label}</span>
          {item.description ? <span className="text-[0.78rem] font-normal text-muted">{item.description}</span> : null}
        </span>
        {item.shortcut ? <Kbd keys={item.shortcut} size="sm" className="ml-4" /> : null}
      </>
    )
    const classes = cn(
      'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.9rem] font-medium no-underline outline-none',
      item.danger ? 'text-danger focus:bg-danger/10' : 'text-ink focus:bg-fill',
      item.disabled && 'cursor-not-allowed opacity-45'
    )
    const shared = {
      role: 'menuitem',
      'data-index': i,
      tabIndex: -1,
      'aria-disabled': item.disabled || undefined,
      className: classes,
      onPointerMove: () => !item.disabled && focusIndex !== i && setFocusIndex(i),
    }
    if (item.href && !item.disabled) {
      return (
        <Link key={i} href={item.href} {...shared} onClick={() => close(false)}>
          {body}
        </Link>
      )
    }
    return (
      <button
        key={i}
        type="button"
        {...shared}
        onClick={() => {
          if (item.disabled) return
          close(true)
          item.onSelect?.()
        }}
      >
        {body}
      </button>
    )
  }

  return (
    <span ref={point ? undefined : anchorRef} className="inline-flex">
      {/* At a point: an empty spot there to open from, in place of the button */}
      {point ? <span ref={anchorRef} aria-hidden className="pointer-events-none fixed size-0" style={{ left: point.x, top: point.y }} /> : triggerWithMenu}
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          style={placed.style}
          onKeyDown={onMenuKeyDown}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null
            if (next && !menuRef.current?.contains(next) && !anchorRef.current?.contains(next)) close(false)
          }}
          className={cn(
            'z-40 flex max-h-[min(24rem,calc(100dvh-1rem))] min-w-48 max-w-[min(20rem,calc(100vw-1rem))] flex-col overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-[0_12px_32px_rgb(0_0_0/0.14)]',
            'starting:translate-y-1 starting:opacity-0 transition-[opacity,translate] duration-150 motion-reduce:transition-none',
            className
          )}
        >
          {items.map((entry, k) =>
            entry === 'separator' ? (
              <div key={`sep-${k}`} role="separator" className="mx-1 my-1 h-px bg-line" />
            ) : isGroup(entry) ? (
              <Fragment key={`group-${k}`}>
                {k > 0 ? <div role="separator" className="mx-1 my-1 h-px bg-line" /> : null}
                <div role="group" aria-labelledby={`${menuId}-g${k}`}>
                  <div id={`${menuId}-g${k}`} className="px-2.5 pt-1.5 pb-1 text-[0.7rem] font-bold tracking-wider text-muted uppercase">
                    {entry.label}
                  </div>
                  {entry.items.map(renderItem)}
                </div>
              </Fragment>
            ) : (
              renderItem(entry)
            )
          )}
        </div>
      ) : null}
    </span>
  )
}
