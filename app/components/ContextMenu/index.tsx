'use client'

import { useRef, useState, type FC, type KeyboardEvent } from 'react'

import { ActionMenu } from '../ActionMenu'
import type { ActionMenuEntry } from '../ActionMenu/types'
import type { ContextMenuProps } from './types'

/** Where the text cursor is, for a menu opened from the keyboard; else the area's top-left */
const caretPoint = (area: HTMLElement) => {
  const selection = window.getSelection()
  const range = selection?.rangeCount && area.contains(selection.anchorNode) ? selection.getRangeAt(0) : null
  // (Older engines, and jsdom, have no rects for ranges: the area's corner then)
  if (range && typeof range.getBoundingClientRect === 'function') {
    const rect = range.getBoundingClientRect()
    if (rect.width || rect.height) return { x: rect.left, y: rect.bottom }
  }
  const rect = area.getBoundingClientRect()
  return { x: rect.left + 16, y: rect.top + 16 }
}

/**
 * A menu of actions on right-click, in place of the browser's: for an editor, a canvas,
 * a list of files.
 *
 *   <ContextMenu items={[{ label: 'Rename', onSelect: rename }, 'separator', { label: 'Delete', danger: true, onSelect: remove }]}>
 *     <FileGrid />
 *   </ContextMenu>
 *
 * The keyboard opens it too: the Menu key or Shift+F10, at the text cursor. It's the same
 * menu as ActionMenu (arrow keys, typing a letter, Escape), and focus goes back to where it
 * was when it closes. Shift+right-click still gives the browser's own menu.
 */
export const ContextMenu: FC<ContextMenuProps> = ({ items, children, label = 'Context menu', onClose, disabled = false, className }) => {
  const [open, setOpen] = useState(false)
  const [point, setPoint] = useState({ x: 0, y: 0 })
  const [entries, setEntries] = useState<ActionMenuEntry[]>([])
  const areaRef = useRef<HTMLDivElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  const show = (x: number, y: number, target: EventTarget | null) => {
    returnTo.current = document.activeElement as HTMLElement | null
    setEntries(typeof items === 'function' ? items(target) : items)
    setPoint({ x, y })
    setOpen(true)
  }

  return (
    <div
      ref={areaRef}
      className={className}
      onContextMenu={(e) => {
        // Shift+right-click: the browser's menu, for its own tools (inspect, spelling)
        if (disabled || e.shiftKey) return
        // Not on the menu itself (it sits inside this area)
        if ((e.target as Element).closest('[role="menu"]')) return e.preventDefault()
        e.preventDefault()
        show(e.clientX, e.clientY, e.target)
      }}
      onKeyDown={(e: KeyboardEvent) => {
        if (disabled || !(e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey))) return
        e.preventDefault()
        const at = caretPoint(areaRef.current!)
        show(at.x, at.y, e.target)
      }}
    >
      {children}
      <ActionMenu
        label={label}
        items={entries}
        point={point}
        open={open}
        onOpenChange={setOpen}
        side="bottom"
        align="start"
        onDismiss={(returnFocus) => {
          if (onClose) onClose(returnFocus)
          else if (returnFocus) returnTo.current?.focus()
        }}
      />
    </div>
  )
}
