'use client'

import { ChevronRight } from 'lucide-react'
import { useCallback, useId, useMemo, useRef, useState, type FC, type KeyboardEvent } from 'react'

import { cn } from '@/lib/cn'

import type { TreeNode, TreeProps } from './types'

type Flat = { node: TreeNode; level: number; parent: string | null }

/** Every branch's id, for "all open" */
const branchIds = (nodes: readonly TreeNode[]): string[] => nodes.flatMap((n) => (n.children?.length ? [n.id, ...branchIds(n.children)] : []))

/** The rows on screen, top to bottom: each node, then (if it's open) what's under it */
const visible = (nodes: readonly TreeNode[], open: ReadonlySet<string>, level = 1, parent: string | null = null): Flat[] =>
  nodes.flatMap((node) => [{ node, level, parent }, ...(node.children?.length && open.has(node.id) ? visible(node.children, open, level + 1, node.id) : [])])

const textOf = (node: TreeNode) => node.textValue ?? (typeof node.label === 'string' ? node.label : '')

/** Every node's id, in order, for ids of their own on the page (a node's id can hold anything) */
const allIds = (nodes: readonly TreeNode[]): string[] => nodes.flatMap((n) => [n.id, ...(n.children ? allIds(n.children) : [])])

const SIZES = {
  sm: { row: 'min-h-7 gap-1.5 px-1.5 text-[0.85rem]', toggle: 'size-5', indent: 'ml-[0.9rem] pl-1.5' },
  md: { row: 'min-h-9 gap-2 px-2 text-[0.95rem]', toggle: 'size-6', indent: 'ml-[1.1rem] pl-2' },
} as const

/**
 * Things inside things: folders and files, pages and the pages under them. Branches open
 * and close; one row can be picked, or each can be a link.
 *
 *   <Tree aria-label="Pages" nodes={[{ id: 'guides', label: 'Guides', children: [{ id: 'parking', label: 'Parking' }] }]} />
 *
 * One Tab stop: the arrow keys move between rows (Right opens a branch or steps into it,
 * Left closes it or steps out to its parent), Home and End go to the first and last, Enter
 * or Space picks a row (or follows its link), * opens every branch beside the current one,
 * and typing a letter jumps to the next row that starts with it. It keeps track of what's
 * open and picked itself; pass `expanded` / `selected` to hold either from outside.
 */
export const Tree: FC<TreeProps> = ({
  nodes,
  expanded: expandedProp,
  defaultExpanded = [],
  onExpandedChange,
  selected: selectedProp,
  defaultSelected = null,
  onSelect,
  selectable = true,
  size = 'md',
  guides = true,
  className,
  ...label
}) => {
  const [ownExpanded, setOwnExpanded] = useState<readonly string[]>(() => (defaultExpanded === 'all' ? branchIds(nodes) : defaultExpanded))
  const [ownSelected, setOwnSelected] = useState<string | null>(defaultSelected)
  const expanded = expandedProp ?? ownExpanded
  const selected = selectedProp === undefined ? ownSelected : selectedProp
  const open = useMemo(() => new Set(expanded), [expanded])
  const rows = useMemo(() => visible(nodes, open), [nodes, open])
  // The row the Tab key lands on: the one last moved to, else the picked one, else the first
  const [active, setActive] = useState<string | null>(null)
  const current = rows.some((r) => r.node.id === active)
    ? active
    : rows.some((r) => r.node.id === selected)
      ? selected
      : (rows.find((r) => !r.node.disabled)?.node.id ?? null)
  // A row's name is its label alone (not the rows under it), and its extra (a count, a badge) is read after it
  const base = useId()
  const domIds = useMemo(() => new Map(allIds(nodes).map((id, i) => [id, `${base}-${i}`])), [nodes, base])
  // Each row's element, by its node's id. Held directly rather than looked up in the page, so a
  // node id that differs between the server's render and the browser's (or holds any character) still finds its row.
  const rows$ = useRef(new Map<string, HTMLLIElement>())
  const typed = useRef({ text: '', at: 0 })
  const s = SIZES[size]

  const setExpanded = useCallback(
    (next: string[]) => {
      if (expandedProp === undefined) setOwnExpanded(next)
      onExpandedChange?.(next)
    },
    [expandedProp, onExpandedChange]
  )
  const toggle = (id: string, to = !open.has(id)) => setExpanded(to ? [...new Set([...expanded, id])] : expanded.filter((x) => x !== id))

  const focus = (id: string) => {
    setActive(id)
    rows$.current.get(id)?.focus()
  }
  const pick = (node: TreeNode) => {
    if (node.disabled) return
    if (selectable) {
      if (selectedProp === undefined) setOwnSelected(node.id)
      onSelect?.(node.id, node)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const at = rows.findIndex((r) => r.node.id === current)
    if (at < 0) return
    const { node, parent } = rows[at]
    const branch = !!node.children?.length
    const move = (to: number) => {
      // Past a disabled row, to the next that isn't
      const step = to > at ? 1 : -1
      let i = Math.min(Math.max(to, 0), rows.length - 1)
      while (rows[i]?.node.disabled && i + step >= 0 && i + step < rows.length) i += step
      if (rows[i] && !rows[i].node.disabled) focus(rows[i].node.id)
    }
    switch (e.key) {
      case 'ArrowDown':
        move(at + 1)
        break
      case 'ArrowUp':
        move(at - 1)
        break
      case 'ArrowRight':
        if (branch && !open.has(node.id)) toggle(node.id, true)
        else if (branch) move(at + 1)
        break
      case 'ArrowLeft':
        if (branch && open.has(node.id)) toggle(node.id, false)
        else if (parent) focus(parent)
        break
      case 'Home':
        move(0)
        break
      case 'End':
        move(rows.length - 1)
        break
      case 'Enter':
      case ' ': {
        if (node.disabled) break
        const link = rows$.current.get(node.id)?.querySelector<HTMLAnchorElement>(':scope > div a[href]')
        // Following it picks the row too, from the row's own click
        if (link && e.key === 'Enter') {
          link.click()
          break
        }
        if (branch && !node.href && !selectable) toggle(node.id)
        pick(node)
        break
      }
      case '*': {
        // Every branch beside this one
        const beside = rows.filter((r) => r.parent === parent && r.node.children?.length).map((r) => r.node.id)
        setExpanded([...new Set([...expanded, ...beside])])
        break
      }
      default: {
        if (e.key.length !== 1 || e.key === ' ') return
        // Letters typed close together spell out the start of a name
        const now = Date.now()
        typed.current = { text: now - typed.current.at < 600 ? typed.current.text + e.key.toLowerCase() : e.key.toLowerCase(), at: now }
        const from = typed.current.text.length > 1 ? at : at + 1
        const order = [...rows.slice(from), ...rows.slice(0, from)]
        const match = order.find((r) => !r.node.disabled && textOf(r.node).toLowerCase().startsWith(typed.current.text))
        if (match) focus(match.node.id)
        else return
      }
    }
    e.preventDefault()
  }

  const renderLevel = (level: readonly TreeNode[], depth: number) =>
    level.map((node, i) => {
      const branch = !!node.children?.length
      const isOpen = branch && open.has(node.id)
      const isSelected = selectable && selected === node.id
      const name = (
        <>
          {node.icon ? (
            <span aria-hidden className={cn('grid shrink-0 place-items-center [&>svg]:size-4', isSelected ? 'text-brand' : 'text-muted')}>
              {node.icon}
            </span>
          ) : null}
          <span id={`${domIds.get(node.id)}-label`} className="min-w-0 flex-1 truncate">
            {node.label}
          </span>
        </>
      )
      return (
        <li
          key={node.id}
          role="treeitem"
          ref={(el) => {
            if (el) rows$.current.set(node.id, el)
            else rows$.current.delete(node.id)
          }}
          aria-label={node.textValue}
          aria-labelledby={node.textValue ? undefined : `${domIds.get(node.id)}-label`}
          aria-describedby={node.meta ? `${domIds.get(node.id)}-meta` : undefined}
          aria-level={depth}
          aria-setsize={level.length}
          aria-posinset={i + 1}
          aria-expanded={branch ? isOpen : undefined}
          aria-selected={selectable ? isSelected : undefined}
          aria-disabled={node.disabled || undefined}
          tabIndex={node.id === current ? 0 : -1}
          onFocus={(e) => {
            if (e.target === e.currentTarget) setActive(node.id)
          }}
          className="list-none outline-none [&:focus-visible>div]:outline-2 [&:focus-visible>div]:outline-brand"
        >
          <div
            onClick={() => {
              if (node.disabled) return
              setActive(node.id)
              // A branch that's neither a link nor pickable has only one thing a click can mean
              if (branch && !node.href && !selectable) toggle(node.id)
              pick(node)
            }}
            className={cn(
              'flex cursor-pointer items-center rounded-md -outline-offset-2 transition-colors select-none',
              s.row,
              isSelected ? 'bg-brand-tint font-semibold text-brand' : 'text-ink hover:bg-fill',
              node.disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent'
            )}
          >
            {branch ? (
              // Not a tab stop of its own: the arrow keys open and close from the row
              <span
                role="presentation"
                data-tree-toggle
                onClick={(e) => {
                  e.stopPropagation()
                  if (node.disabled) return
                  setActive(node.id)
                  toggle(node.id)
                }}
                className={cn('grid shrink-0 place-items-center rounded text-muted hover:bg-line hover:text-ink', s.toggle)}
              >
                <ChevronRight aria-hidden className={cn('size-4 transition-transform duration-150 motion-reduce:transition-none', isOpen && 'rotate-90')} />
              </span>
            ) : (
              <span aria-hidden className={cn('shrink-0', s.toggle)} />
            )}
            {node.href && !node.disabled ? (
              <a href={node.href} tabIndex={-1} className="flex min-w-0 flex-1 items-center gap-[inherit] text-inherit no-underline">
                {name}
              </a>
            ) : (
              name
            )}
            {node.meta ? (
              <span id={`${domIds.get(node.id)}-meta`} className="shrink-0 text-[0.8em] font-normal text-muted tabular-nums">
                {node.meta}
              </span>
            ) : null}
          </div>
          {isOpen ? (
            <ul role="group" className={cn('m-0 p-0', s.indent, guides && 'border-l border-line')}>
              {renderLevel(node.children!, depth + 1)}
            </ul>
          ) : null}
        </li>
      )
    })

  return (
    <ul role="tree" aria-label={label['aria-label']} aria-labelledby={label['aria-labelledby']} onKeyDown={onKeyDown} className={cn('m-0 flex flex-col p-0', className)}>
      {renderLevel(nodes, 1)}
    </ul>
  )
}
