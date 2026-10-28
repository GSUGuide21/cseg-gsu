'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'
import { $getNodeByKey, COMMAND_PRIORITY_LOW, KEY_ENTER_COMMAND, type NodeKey } from 'lexical'
import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, type FC, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

const frameTool =
  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[0.78rem] font-semibold text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand [&>svg]:size-3.5'

/**
 * Around a block the editor draws with React (an image, a row of buttons): a click selects
 * it (Backspace then takes it out, as with a divider), and while it's selected, Edit and
 * Remove sit on its corner. Enter or a double-click opens its editing too, so it works
 * from the keyboard: the arrow keys select it like any block.
 */
export const BlockFrame: FC<{ nodeKey: NodeKey; label: string; onEdit: () => void; children: ReactNode }> = ({ nodeKey, label, onEdit, children }) => {
  const [editor] = useLexicalComposerContext()
  const editable = useLexicalEditable()
  const [selected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey)

  useEffect(() => {
    if (!selected || !editable) return
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        event?.preventDefault()
        onEdit()
        return true
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, selected, editable, onEdit])

  const remove = () => {
    editor.update(() => $getNodeByKey(nodeKey)?.remove())
    editor.focus()
  }

  return (
    <div
      className={cn('relative rounded-xl outline-offset-4', editable && 'cursor-default', selected && 'outline-2 outline-brand')}
      onClick={(e) => {
        if (!editable) return
        if (!e.shiftKey) clearSelected()
        setSelected(true)
      }}
      onDoubleClick={() => editable && onEdit()}
    >
      {children}
      {editable && selected ? (
        <div
          role="group"
          aria-label={label}
          // A click here is for these buttons, not for selecting the block again
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shadow-[0_6px_16px_rgb(0_0_0/0.12)]"
        >
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onEdit} className={frameTool}>
            <Pencil aria-hidden /> Edit
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={remove} className={cn(frameTool, 'hover:bg-danger/10 hover:text-danger')}>
            <Trash2 aria-hidden /> Remove
          </button>
        </div>
      ) : null}
    </div>
  )
}
