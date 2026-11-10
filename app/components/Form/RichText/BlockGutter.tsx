'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin'
import { $createParagraphNode, $createTextNode, $getNearestNodeFromDOMNode, $getNodeByKey, $isParagraphNode, type NodeKey } from 'lexical'
import { GripVertical, Plus } from 'lucide-react'
import { useRef, useState, type FC, type MouseEvent } from 'react'

import { ActionMenu } from '../../ActionMenu'
import type { ActionItem } from '../../ActionMenu/types'
import { BLOCK_ACTIONS } from './commands'

const isOnGutter = (el: HTMLElement) => !!el.closest('[data-block-gutter]')

const handle =
  'grid size-5.5 place-items-center rounded-md text-ink-faint transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand [&>svg]:size-3.5'

/**
 * Beside the block under the pointer: "+" opens the slash menu on a new line below it, and
 * the grip drags the block somewhere else, or opens its menu on a click (move, duplicate,
 * delete). For the pointer: from the keyboard, the same actions are on the context menu
 * and the shortcuts in editing.ts. `anchor` is what these are placed in.
 */
export const BlockGutter: FC<{ anchor: HTMLElement }> = ({ anchor }) => {
  const [editor] = useLexicalComposerContext()
  const gutterRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  // The block under the pointer, which moves on as soon as the pointer does
  const hovered = useRef<HTMLElement | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; key: NodeKey; items: ActionItem[] } | null>(null)

  const hoveredBlock = () => (hovered.current ? ($getNearestNodeFromDOMNode(hovered.current)?.getTopLevelElement() ?? null) : null)

  /** An empty line can take the "/" itself; otherwise it's a new line below */
  const addBelow = () => {
    editor.update(() => {
      const block = hoveredBlock()
      if (!block) return
      const slash = $createTextNode('/')
      if ($isParagraphNode(block) && block.isEmpty()) block.append(slash)
      else block.insertAfter($createParagraphNode().append(slash))
      slash.selectEnd()
    })
    editor.focus()
  }

  const openMenu = (e: MouseEvent) => {
    const { clientX: x, clientY: y } = e
    const opened = editor.read(() => {
      const block = hoveredBlock()
      if (!block) return null
      return {
        key: block.getKey(),
        items: BLOCK_ACTIONS.map((a): ActionItem => ({
          label: a.label,
          danger: a.danger,
          disabled: a.$can ? !a.$can(block) : false,
          shortcut: a.keys.length ? a.keys : undefined,
          onSelect: () => {
            editor.update(() => {
              const target = $getNodeByKey(block.getKey())
              if (target) a.$run(target)
            })
            editor.focus()
          },
        })),
      }
    })
    if (opened) setMenu({ x, y, ...opened })
  }

  return (
    <>
      <DraggableBlockPlugin_EXPERIMENTAL
        anchorElem={anchor}
        menuRef={gutterRef}
        targetLineRef={lineRef}
        isOnMenu={isOnGutter}
        onElementChanged={(el) => {
          hovered.current = el
        }}
        menuComponent={
          // Placed by the plugin, which shows it (display: flex) over the block under the pointer
          <div ref={gutterRef} data-block-gutter className="absolute top-0 left-0 hidden items-center will-change-transform">
            <button type="button" tabIndex={-1} aria-label="Add a block below" title="Add a block below" onClick={addBelow} className={`${handle} cursor-pointer`}>
              <Plus aria-hidden />
            </button>
            {/* Not a <button>, which Firefox won't start a drag from; nor any preventDefault on mousedown, which stops one anywhere */}
            <div role="button" tabIndex={-1} aria-label="Drag to move, or click for block options" title="Drag to move, or click for options" onClick={openMenu} className={`${handle} cursor-grab active:cursor-grabbing`}>
              <GripVertical aria-hidden />
            </div>
          </div>
        }
        targetLineComponent={<div ref={lineRef} aria-hidden className="pointer-events-none absolute top-0 left-0 h-1 rounded-full bg-brand opacity-0" />}
      />
      {menu ? (
        <ActionMenu
          label="Block options"
          point={{ x: menu.x, y: menu.y }}
          open
          onOpenChange={(open) => !open && setMenu(null)}
          side="bottom"
          align="start"
          items={menu.items}
          onDismiss={(returnFocus) => returnFocus && editor.focus()}
        />
      ) : null}
    </>
  )
}
