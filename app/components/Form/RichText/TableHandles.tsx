'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getTableCellNodeFromLexicalNode,
  $insertTableColumnAtNode,
  $insertTableRowAtNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $isTableSelection,
  type TableCellNode,
} from '@lexical/table'
import { $getNearestNodeFromDOMNode, $getNodeByKey, $getSelection, $isRangeSelection, type NodeKey } from 'lexical'
import { ChevronDown, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FC } from 'react'

import { ActionMenu } from '../../ActionMenu'
import { $hasHeaderRow, $toggleHeaderRow, TABLE_ACTIONS } from './commands'

/** Where something is, in the handles' layer */
interface Box {
  top: number
  left: number
  width: number
  height: number
}

const boxOf = (el: Element, layer: DOMRect): Box => {
  const r = el.getBoundingClientRect()
  return { top: r.top - layer.top, left: r.left - layer.left, width: r.width, height: r.height }
}

/** A thin "+" bar along a table's edge: faint until the pointer's on it */
const addBar =
  'pointer-events-auto absolute grid cursor-pointer place-items-center rounded-md bg-fill text-brand opacity-70 transition-[opacity,background-color] hover:bg-brand-tint hover:opacity-100 [&>svg]:size-3.5'

/**
 * Tools on the table itself, over the writing area. The cell the cursor's in gets a menu
 * button in its corner (insert or delete rows and columns, the header row, delete the
 * table), and hovering a table shows "+" bars along its bottom and right edges that add a
 * row or a column at the end. The same actions are on the Table tab and the right-click
 * menu; these are for reaching them without leaving the table.
 */
export const TableHandles: FC<{ disabled: boolean }> = ({ disabled }) => {
  const [editor] = useLexicalComposerContext()
  const layerRef = useRef<HTMLDivElement>(null)
  // The cell the cursor's in, and the table under the pointer, by their nodes' keys
  const [cellKey, setCellKey] = useState<NodeKey | null>(null)
  const [hoverKey, setHoverKey] = useState<NodeKey | null>(null)
  const [headerRow, setHeaderRow] = useState(false)
  const [focused, setFocused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // Where those are drawn; worked out again on scroll, resize, and every change
  const [boxes, setBoxes] = useState<{ cell: Box | null; table: Box | null; view: Box | null }>({ cell: null, table: null, view: null })

  const measure = useCallback(() => {
    const layer = layerRef.current?.getBoundingClientRect()
    if (!layer) return
    const cellEl = cellKey ? editor.getElementByKey(cellKey) : null
    // The table's own element, and the part of it in view (wide tables scroll sideways)
    const tableHost = hoverKey ? editor.getElementByKey(hoverKey) : null
    const tableEl = tableHost?.matches('table') ? tableHost : (tableHost?.querySelector('table') ?? null)
    const viewEl = tableEl?.parentElement && tableEl.parentElement !== editor.getRootElement() ? tableEl.parentElement : tableEl
    setBoxes({ cell: cellEl ? boxOf(cellEl, layer) : null, table: tableEl ? boxOf(tableEl, layer) : null, view: viewEl ? boxOf(viewEl, layer) : null })
  }, [editor, cellKey, hoverKey])

  // The cell the cursor's in, after every change
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection()
          const anchor = $isRangeSelection(selection) || $isTableSelection(selection) ? selection.anchor.getNode() : null
          const cell = anchor ? $getTableCellNodeFromLexicalNode(anchor) : null
          setCellKey(cell?.getKey() ?? null)
          setHeaderRow(cell ? $hasHeaderRow() : false)
        })
        // The hovered table may be gone (deleted, or undone)
        setHoverKey((key) => (key && editorState.read(() => $isTableNode($getNodeByKey(key))) ? key : null))
      }),
    [editor]
  )

  // Measured again after each change above, and on scrolling or resizing anything
  useEffect(() => {
    measure()
    const root = editor.getRootElement()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (root) observer?.observe(root)
    window.addEventListener('resize', measure)
    document.addEventListener('scroll', measure, true)
    const off = editor.registerUpdateListener(() => requestAnimationFrame(measure))
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      document.removeEventListener('scroll', measure, true)
      off()
    }
  }, [editor, measure])

  // The table under the pointer (over the writing area, or over these handles), and whether
  // focus is in the writing area or on the cell's menu button
  useEffect(() => {
    const area = layerRef.current?.parentElement
    if (!area) return
    const onMove = (e: PointerEvent) => {
      const target = e.target as Element
      if (target.closest('[data-table-handle]')) return
      const table = target.closest('table')
      const key = table && editor.getRootElement()?.contains(table) ? editor.read(() => $getNearestNodeFromDOMNode(table)?.getKey() ?? null) : null
      setHoverKey(key)
    }
    const onLeave = () => setHoverKey(null)
    const onFocusIn = () => setFocused(true)
    const onFocusOut = (e: FocusEvent) => {
      if (!area.contains(e.relatedTarget as Node | null)) setFocused(false)
    }
    area.addEventListener('pointermove', onMove)
    area.addEventListener('pointerleave', onLeave)
    area.addEventListener('focusin', onFocusIn)
    area.addEventListener('focusout', onFocusOut)
    return () => {
      area.removeEventListener('pointermove', onMove)
      area.removeEventListener('pointerleave', onLeave)
      area.removeEventListener('focusin', onFocusIn)
      area.removeEventListener('focusout', onFocusOut)
    }
  }, [editor])

  /** Runs a table change, then puts the cursor back in the text */
  const run = (fn: () => void) => {
    editor.update(fn)
    editor.focus()
  }

  /** A row after the last one, or a column after the last, with the cursor in its first cell */
  const addAtEnd = (what: 'row' | 'column') =>
    run(() => {
      const table = hoverKey ? $getNodeByKey(hoverKey) : null
      if (!$isTableNode(table)) return
      const row = what === 'row' ? table.getLastChild() : table.getFirstChild()
      const cell = $isTableRowNode(row) ? (what === 'row' ? row.getFirstChild() : row.getLastChild()) : null
      if (!$isTableCellNode(cell)) return
      if (what === 'row') {
        const added = $insertTableRowAtNode(cell, true)
        const first = added?.getFirstChild<TableCellNode>()
        first?.selectStart()
      } else $insertTableColumnAtNode(cell, true, true)
    })

  if (disabled) return null
  const { cell, table, view } = boxes
  const showMenu = cell && (focused || menuOpen)

  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0 z-5">
      {table && view ? (
        <>
          {/* For the pointer: from the keyboard, the cell's menu inserts rows and columns */}
          <button
            type="button"
            data-table-handle
            tabIndex={-1}
            aria-label="Add a row"
            title="Add a row"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => addAtEnd('row')}
            className={addBar}
            style={{ top: table.top + table.height + 1, left: view.left, width: view.width, height: 12 }}
          >
            <Plus aria-hidden />
          </button>
          <button
            type="button"
            data-table-handle
            tabIndex={-1}
            aria-label="Add a column"
            title="Add a column"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => addAtEnd('column')}
            className={addBar}
            style={{ top: table.top, left: view.left + view.width + 1, width: 12, height: table.height }}
          >
            <Plus aria-hidden />
          </button>
        </>
      ) : null}
      {/* After the "+" bars, so it's on top where they meet. It sits on the cell's right
          border, half in each cell's padding, so it never covers the words either side. */}
      {showMenu ? (
        <div data-table-handle className="pointer-events-auto absolute" style={{ top: cell.top + 8, left: cell.left + cell.width - 11 }}>
          <ActionMenu
            label="Table options"
            align="end"
            open={menuOpen}
            onOpenChange={setMenuOpen}
            onDismiss={(returnFocus) => returnFocus && editor.focus()}
            trigger={
              <button
                type="button"
                aria-label="Table options"
                // The cursor stays in the cell, so the actions know where they apply
                onMouseDown={(e) => e.preventDefault()}
                className="grid size-5.5 cursor-pointer place-items-center rounded-md border border-line bg-surface text-ink-soft shadow-[0_2px_6px_rgb(0_0_0/0.08)] transition-colors hover:border-brand-edge hover:text-brand focus-visible:outline-2 focus-visible:outline-brand aria-expanded:border-brand aria-expanded:text-brand"
              >
                <ChevronDown size={14} aria-hidden />
              </button>
            }
            items={[
              ...TABLE_ACTIONS.filter((a) => !a.danger).map((a) => ({ label: a.label, onSelect: () => run(a.$run) })),
              'separator' as const,
              { label: headerRow ? 'Remove header row' : 'Make the first row headers', onSelect: () => run($toggleHeaderRow) },
              'separator' as const,
              ...TABLE_ACTIONS.filter((a) => a.danger).map((a) => ({ label: a.label, danger: true, onSelect: () => run(a.$run) })),
            ]}
          />
        </div>
      ) : null}
    </div>
  )
}
