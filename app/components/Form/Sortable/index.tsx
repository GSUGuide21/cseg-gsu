'use client'

import { GripVertical } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FC, type KeyboardEvent, type PointerEvent } from 'react'

import { cn } from '@/lib/cn'

import { useControllable } from '../useControllable'
import type { SortableHandleProps, SortableProps } from './types'

const move = <T,>(list: readonly T[], from: number, to: number) => {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** What the list draws during a pointer drag */
type Drag = { from: number; to: number; offset: number; size: number }

/**
 * The drag's measurements, taken when it starts, in page coordinates (so scrolling the
 * page mid-drag doesn't throw them off)
 */
type DragInfo = {
  pointerId: number
  handle: HTMLElement
  from: number
  /** Gap included: how far each other item slides to make room */
  size: number
  startPointer: number
  /** Where each item starts and how long it is, along the list */
  leads: number[]
  lengths: number[]
  listStart: number
  listEnd: number
  /** The pointer's latest place on screen */
  client: { clientX: number; clientY: number }
}

/** Within this many px of the screen's edge, dragging scrolls the page */
const SCROLL_EDGE = 56
/** Fastest auto-scroll, in px per frame, right at the edge */
const SCROLL_SPEED = 18

/**
 * A list people reorder by dragging an item's handle, or from the keyboard: focus a
 * handle, press Space to pick the item up, arrow keys to move it, Space to drop it, or
 * Escape to put it back. Each step is announced to screen readers.
 *
 * While dragging: the page scrolls when the pointer nears the top or bottom of the screen
 * (left or right for a horizontal list), the item stays within the list, and Escape puts
 * it back where it started.
 *
 *   <Sortable
 *     defaultItems={officers}
 *     getKey={(o) => o.id}
 *     getLabel={(o) => o.name}
 *     name="order"
 *     renderItem={(o, { handleProps }) => (
 *       <div className="flex items-center gap-3 rounded-lg border border-line p-3">
 *         <SortableHandle {...handleProps} /> {o.name}
 *       </div>
 *     )}
 *   />
 */
export function Sortable<T>({
  items: itemsProp,
  defaultItems = [],
  onItemsChange,
  getKey,
  getLabel,
  renderItem,
  orientation = 'vertical',
  name,
  disabled = false,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: SortableProps<T>) {
  const [items, setItems] = useControllable(itemsProp, defaultItems, onItemsChange as ((v: readonly T[]) => void) | undefined)
  const listRef = useRef<HTMLUListElement>(null)
  const info = useRef<DragInfo | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  // The latest drag, for listeners that outlive a render (scroll, Escape)
  const latest = useRef<Drag | null>(null)
  // Right after a drop the items' slide transitions are paused for a frame; otherwise each
  // item moved aside would replay its slide from its new place and visibly hop
  const [settling, setSettling] = useState(false)
  // Keyboard: the item picked up, and the order to restore on Escape
  const [grabbed, setGrabbed] = useState<string | null>(null)
  const before = useRef<readonly T[] | null>(null)
  const refocus = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const helpId = useId()
  const horizontal = orientation === 'horizontal'
  const label = (item: T) => getLabel?.(item) ?? getKey(item)
  const of = `of ${items.length}`

  // Reordering moves the focused handle's element, which drops focus; put it back
  useEffect(() => {
    const key = refocus.current
    if (!key || !listRef.current) return
    const row = [...listRef.current.children].find((el) => (el as HTMLElement).dataset.sortableKey === key)
    row?.querySelector<HTMLElement>('[data-sortable-handle]')?.focus()
    refocus.current = null
  })

  const along = (e: { clientX: number; clientY: number }) => (horizontal ? e.clientX : e.clientY)
  const lead = (r: DOMRect) => (horizontal ? r.left : r.top)
  const length = (r: DOMRect) => (horizontal ? r.width : r.height)
  const scrolled = () => (horizontal ? window.scrollX : window.scrollY)

  /** Re-place the dragged item from the pointer and the page's scroll */
  const follow = () => {
    const d = info.current
    if (!d) return
    const raw = along(d.client) + scrolled() - d.startPointer
    // Drawn within the list: no further than the first or last place
    const offset = Math.min(d.listEnd - (d.leads[d.from] + d.lengths[d.from]), Math.max(d.listStart - d.leads[d.from], raw))
    // Placed by where the pointer really is, though: held at the end, the item's middle could
    // only reach the last item's middle, never pass it, so the last place was out of reach
    const middle = d.leads[d.from] + d.lengths[d.from] / 2 + raw
    // Its new place: after every other item whose middle it has passed. Reaching an item's
    // middle counts as passing it in either direction, so dropping onto an item takes its place.
    const to = d.leads.filter((l, j) => {
      const mid = l + d.lengths[j] / 2
      return j < d.from ? mid < middle : j > d.from && mid <= middle
    }).length
    const next = { from: d.from, to, offset, size: d.size }
    latest.current = next
    setDrag(next)
  }

  /** End a pointer drag: drop the item where it is, or (Escape, a lost pointer) put it back */
  const finish = (commit: boolean) => {
    const d = info.current
    const last = latest.current
    if (!d) return
    info.current = null
    latest.current = null
    if (d.handle.hasPointerCapture(d.pointerId)) d.handle.releasePointerCapture(d.pointerId)
    if (commit && last && last.to !== last.from) {
      const item = items[last.from]
      setSettling(true)
      setItems(move(items, last.from, last.to))
      setAnnouncement(`${label(item)} moved to position ${last.to + 1} ${of}.`)
    } else if (!commit && last && last.to !== last.from) {
      setAnnouncement(`Move cancelled. ${label(items[last.from])} is back where it started.`)
    }
    setDrag(null)
  }

  const dragging = drag !== null

  // While dragging: follow page scrolls, scroll near the screen's edges, cancel on Escape,
  // and show the grabbing cursor everywhere
  useEffect(() => {
    if (!dragging) return
    const onScroll = () => follow()
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      finish(false)
    }
    let frame = 0
    const autoScroll = () => {
      const d = info.current
      if (!d) return
      const pos = along(d.client)
      const size = horizontal ? window.innerWidth : window.innerHeight
      const speed =
        pos < SCROLL_EDGE ? -((SCROLL_EDGE - pos) / SCROLL_EDGE) * SCROLL_SPEED : pos > size - SCROLL_EDGE ? ((pos - (size - SCROLL_EDGE)) / SCROLL_EDGE) * SCROLL_SPEED : 0
      if (speed) window.scrollBy({ [horizontal ? 'left' : 'top']: speed, behavior: 'instant' })
      frame = requestAnimationFrame(autoScroll)
    }
    frame = requestAnimationFrame(autoScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKeyDown, true)
    const root = document.documentElement
    const cursor = root.style.cursor
    root.style.cursor = 'grabbing'
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKeyDown, true)
      root.style.cursor = cursor
    }
    // follow and finish read refs and the current items; re-subscribing on each move isn't needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  // One frame after a drop, slides come back on
  useEffect(() => {
    if (!settling) return
    const frame = requestAnimationFrame(() => setSettling(false))
    return () => cancelAnimationFrame(frame)
  }, [settling])

  const handleProps = (item: T, index: number): SortableHandleProps => {
    const key = getKey(item)
    return {
      'data-sortable-handle': true,
      role: 'button',
      tabIndex: disabled ? -1 : 0,
      'aria-label': `Reorder ${label(item)}`,
      'aria-describedby': helpId,
      'aria-pressed': grabbed === key,
      'aria-disabled': disabled || undefined,

      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (disabled || e.button !== 0 || !listRef.current || info.current) return
        e.preventDefault()
        // A keyboard pick-up in progress gives way to the pointer
        setGrabbed(null)
        const s = scrolled()
        const rects = [...listRef.current.children].map((el) => el.getBoundingClientRect())
        const list = listRef.current.getBoundingClientRect()
        const gap = rects.length > 1 ? lead(rects[1]) - (lead(rects[0]) + length(rects[0])) : 0
        info.current = {
          pointerId: e.pointerId,
          handle: e.currentTarget,
          from: index,
          size: length(rects[index]) + gap,
          startPointer: along(e) + s,
          leads: rects.map((r) => lead(r) + s),
          lengths: rects.map(length),
          listStart: lead(list) + s,
          listEnd: lead(list) + length(list) + s,
          client: { clientX: e.clientX, clientY: e.clientY },
        }
        e.currentTarget.setPointerCapture(e.pointerId)
        follow()
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        const d = info.current
        if (!d || e.pointerId !== d.pointerId) return
        d.client = { clientX: e.clientX, clientY: e.clientY }
        follow()
      },
      onPointerUp: (e: PointerEvent<HTMLElement>) => {
        if (info.current?.pointerId === e.pointerId) finish(true)
      },
      onPointerCancel: () => finish(false),
      // The browser took the pointer away (a system gesture, a lost window): put it back
      onLostPointerCapture: () => finish(false),

      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        if (disabled) return
        const forward = horizontal ? 'ArrowRight' : 'ArrowDown'
        const back = horizontal ? 'ArrowLeft' : 'ArrowUp'
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          if (grabbed === key) {
            setGrabbed(null)
            setAnnouncement(`${label(item)} dropped at position ${index + 1} ${of}.`)
          } else {
            before.current = items
            setGrabbed(key)
            setAnnouncement(`${label(item)} picked up, position ${index + 1} ${of}. Use the arrow keys to move it, Space to drop, Escape to cancel.`)
          }
        } else if (grabbed === key && (e.key === forward || e.key === back)) {
          e.preventDefault()
          const to = Math.min(items.length - 1, Math.max(0, index + (e.key === forward ? 1 : -1)))
          if (to === index) return
          refocus.current = key
          setItems(move(items, index, to))
          setAnnouncement(`${label(item)} moved to position ${to + 1} ${of}.`)
        } else if (grabbed === key && e.key === 'Escape') {
          e.preventDefault()
          refocus.current = key
          if (before.current) setItems([...before.current])
          setGrabbed(null)
          setAnnouncement(`Move cancelled. ${label(item)} is back where it started.`)
        }
      },
      onBlur: () => {
        if (grabbed === key && !refocus.current) setGrabbed(null)
      },
    }
  }

  /** How far an item slides to open a gap where the dragged item will land */
  const shift = (i: number) => {
    if (!drag || i === drag.from) return 0
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return -drag.size
    if (drag.to < drag.from && i >= drag.to && i < drag.from) return drag.size
    return 0
  }

  return (
    <>
      <ul
        ref={listRef}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn('m-0 flex list-none gap-2 p-0', horizontal ? 'flex-row flex-wrap' : 'flex-col', className)}
      >
        {items.map((item, i) => {
          const key = getKey(item)
          const dragged = drag?.from === i
          const offset = dragged ? drag.offset : shift(i)
          return (
            <li
              key={key}
              data-sortable-key={key}
              style={offset ? { transform: horizontal ? `translateX(${offset}px)` : `translateY(${offset}px)` } : undefined}
              className={cn(
                'relative',
                dragged
                  ? 'z-10 opacity-95 shadow-[0_10px_28px_rgb(0_0_0/0.18)]'
                  : !settling && 'transition-transform duration-150 motion-reduce:transition-none',
                grabbed === key && 'rounded-lg ring-2 ring-brand'
              )}
            >
              {renderItem(item, { index: i, active: dragged || grabbed === key, handleProps: handleProps(item, i) })}
            </li>
          )
        })}
      </ul>
      <span id={helpId} hidden>
        Press Space to pick up. Use the arrow keys to move, Space to drop, and Escape to cancel.
      </span>
      <span className="sr-only" aria-live="assertive">
        {announcement}
      </span>
      {name ? items.map((item) => <input key={getKey(item)} type="hidden" name={name} value={getKey(item)} />) : null}
    </>
  )
}

/** A grip icon to drag an item by; spread the item's `handleProps` onto it */
export const SortableHandle: FC<SortableHandleProps & { className?: string }> = ({ className, ...props }) => (
  <span
    {...props}
    className={cn(
      'grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-md text-ink-faint transition-colors select-none',
      'hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand active:cursor-grabbing',
      'aria-pressed:bg-brand-tint aria-pressed:text-brand aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
      className
    )}
  >
    <GripVertical size={17} aria-hidden />
  </span>
)
