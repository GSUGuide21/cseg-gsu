'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getTableCellNodeFromLexicalNode } from '@lexical/table'
import { $getSelection, $isRangeSelection, $selectAll, FORMAT_TEXT_COMMAND, type TextFormatType } from 'lexical'
import {
  Bold,
  ClipboardPaste,
  Copy,
  Italic,
  RemoveFormatting,
  Scissors,
  Strikethrough,
  TextSelect,
  Underline,
} from 'lucide-react'
import type { FC, ReactNode } from 'react'

import type { ActionItem, ActionMenuEntry } from '../../ActionMenu/types'
import { ContextMenu } from '../../ContextMenu'
import { $clearFormatting, $hasHeaderRow, $toggleHeaderRow, TABLE_ACTIONS } from './commands'
import { useClipboard } from './tools'

/**
 * The editor's right-click menu (and the Menu key's, or Shift+F10's): cut, copy, and paste,
 * text marks and clearing them, the table tools inside a table, and select all.
 *
 * The clipboard items are useClipboard's (shared with the ribbon).
 */
export const RichTextContextMenu: FC<{ readOnly: boolean; children: ReactNode; className?: string }> = ({ readOnly, children, className }) => {
  const [editor] = useLexicalComposerContext()

  const { copy, cut, paste, run } = useClipboard()

  const format = (f: TextFormatType) => {
    editor.focus()
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, f)
  }

  const items = (): ActionMenuEntry[] => {
    const { hasText, inTable, headerRow } = editor.getEditorState().read(() => {
      const selection = $getSelection()
      const range = $isRangeSelection(selection) ? selection : null
      return { hasText: !!range && !range.isCollapsed(), inTable: !!range && $getTableCellNodeFromLexicalNode(range.anchor.getNode()) !== null, headerRow: $hasHeaderRow() }
    })
    const tableItems: ActionItem[] = TABLE_ACTIONS.flatMap((a, i) => [
      { label: a.label, danger: a.danger, onSelect: () => run(a.$run) },
      // The header row goes after the inserts, before the deletes
      ...(i === 3 ? [{ label: headerRow ? 'Remove header row' : 'Make the first row headers', onSelect: () => run($toggleHeaderRow) }] : []),
    ])
    const edit: ActionItem[] = readOnly
      ? [{ label: 'Copy', icon: <Copy />, shortcut: ['mod', 'C'], disabled: !hasText, onSelect: copy }]
      : [
          {
            label: 'Cut',
            icon: <Scissors />,
            shortcut: ['mod', 'X'],
            disabled: !hasText,
            onSelect: cut,
          },
          { label: 'Copy', icon: <Copy />, shortcut: ['mod', 'C'], disabled: !hasText, onSelect: copy },
          { label: 'Paste', icon: <ClipboardPaste />, shortcut: ['mod', 'V'], onSelect: () => paste(false) },
          { label: 'Paste as plain text', shortcut: ['mod', 'shift', 'V'], onSelect: () => paste(true) },
        ]
    if (readOnly) return [...edit, 'separator', { label: 'Select all', icon: <TextSelect />, shortcut: ['mod', 'A'], onSelect: () => run($selectAll) }]
    return [
      ...edit,
      'separator',
      { label: 'Bold', icon: <Bold />, shortcut: ['mod', 'B'], onSelect: () => format('bold') },
      { label: 'Italic', icon: <Italic />, shortcut: ['mod', 'I'], onSelect: () => format('italic') },
      { label: 'Underline', icon: <Underline />, shortcut: ['mod', 'U'], onSelect: () => format('underline') },
      { label: 'Strikethrough', icon: <Strikethrough />, onSelect: () => format('strikethrough') },
      { label: 'Clear formatting', icon: <RemoveFormatting />, description: 'Marks, font, size, and colors', onSelect: () => run($clearFormatting) },
      ...(inTable ? [{ label: 'Table', items: tableItems }] : []),
      'separator',
      { label: 'Select all', icon: <TextSelect />, shortcut: ['mod', 'A'], onSelect: () => run($selectAll) },
    ]
  }

  return (
    <ContextMenu label="Editing" items={items} onClose={(returnFocus) => returnFocus && editor.focus()} className={className}>
      {children}
    </ContextMenu>
  )
}
