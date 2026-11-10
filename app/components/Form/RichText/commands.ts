import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableRowNode,
  $isTableSelection,
  $setTableRowIsHeader,
  TableCellHeaderStates,
} from '@lexical/table'
import {
  $createParagraphNode,
  $getPreviousSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $parseSerializedNode,
  type LexicalNode,
  type SerializedLexicalNode,
} from 'lexical'

/**
 * Puts a block in (an image, a table, buttons) with `insert`; when the cursor was on an
 * empty line, the block takes that line's place rather than leaving a blank paragraph
 * above it. Runs inside editor.update.
 */
export const $replacingEmptyLine = (insert: () => void) => {
  // Not clicked into yet: it goes at the end, as typing would
  if (!$getSelection() && !$getPreviousSelection()) $getRoot().selectEnd()
  const selection = $getSelection()
  const at = $isRangeSelection(selection) && selection.isCollapsed() ? selection.anchor.getNode() : null
  const emptyLine = $isParagraphNode(at) && at.isEmpty() ? at : null
  insert()
  // Unless the cursor went back into it: then it's the line after the block, and stays
  const anchor = $getSelection()?.getNodes()[0]
  if (emptyLine?.isAttached() && emptyLine.isEmpty() && !emptyLine.is(anchor)) emptyLine.remove()
}

/** The table the cursor is in (or the cells selected across), if any */
const $selectedTable = () => {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) && !$isTableSelection(selection)) return null
  const cell = $getTableCellNodeFromLexicalNode(selection.anchor.getNode())
  return cell ? $getTableNodeFromLexicalNodeOrThrow(cell) : null
}

/** Whether the cursor's table has a header row: its first row's cells are all headers */
export const $hasHeaderRow = () => {
  const first = $selectedTable()?.getFirstChild()
  const cells = $isTableRowNode(first) ? first.getChildren() : []
  return cells.length > 0 && cells.every((c) => $isTableCellNode(c) && c.hasHeaderState(TableCellHeaderStates.ROW))
}

/** Turns the first row of the cursor's table into headers, or back */
export const $toggleHeaderRow = () => {
  const table = $selectedTable()
  if (table) $setTableRowIsHeader(table, 0, !$hasHeaderRow())
}

/** The table the cursor is in, taken out whole */
export const $deleteTableAtSelection = () => $selectedTable()?.remove()

/** What can be done to a table from the toolbar or the context menu; each runs inside editor.update */
export const TABLE_ACTIONS: { label: string; danger?: boolean; $run: () => void }[] = [
  { label: 'Insert row above', $run: () => $insertTableRowAtSelection(false) },
  { label: 'Insert row below', $run: () => $insertTableRowAtSelection(true) },
  { label: 'Insert column left', $run: () => $insertTableColumnAtSelection(false) },
  { label: 'Insert column right', $run: () => $insertTableColumnAtSelection(true) },
  { label: 'Delete row', danger: true, $run: () => $deleteTableRowAtSelection() },
  { label: 'Delete column', danger: true, $run: () => $deleteTableColumnAtSelection() },
  { label: 'Delete table', danger: true, $run: $deleteTableAtSelection },
]

/** The block the selection starts in: its own, whole, however deep the cursor is (a table, a list) */
export const $selectedBlock = () => $getSelection()?.getNodes()[0]?.getTopLevelElement() ?? null

/** A node and everything in it, as saved */
const serialized = (node: LexicalNode): SerializedLexicalNode => ({
  ...node.exportJSON(),
  ...($isElementNode(node) ? { children: node.getChildren().map(serialized) } : {}),
})

const $moveBlock = (block: LexicalNode, by: 1 | -1) => {
  if (by < 0) block.getPreviousSibling()?.insertBefore(block)
  else block.getNextSibling()?.insertAfter(block)
}

/** The block a menu or shortcut is pointing at can be the only one; there's then a line left to type on */
const $deleteBlock = (block: LexicalNode) => {
  block.remove()
  if ($getRoot().isEmpty()) $getRoot().append($createParagraphNode()).selectEnd()
}

/** What can be done to a whole block, from its gutter, the context menu, or the keyboard; each runs inside editor.update */
export const BLOCK_ACTIONS: { label: string; keys: string[]; danger?: boolean; $can?: (block: LexicalNode) => boolean; $run: (block: LexicalNode) => void }[] = [
  { label: 'Move up', keys: ['alt', '↑'], $can: (b) => !!b.getPreviousSibling(), $run: (b) => $moveBlock(b, -1) },
  { label: 'Move down', keys: ['alt', '↓'], $can: (b) => !!b.getNextSibling(), $run: (b) => $moveBlock(b, 1) },
  { label: 'Duplicate', keys: ['alt', 'shift', '↓'], $run: (b) => b.insertAfter($parseSerializedNode(serialized(b))) },
  { label: 'Delete block', keys: [], danger: true, $run: $deleteBlock },
]

/** Back to plain text: no bold through code, and no font, size, or colors */
export const $clearFormatting = () => {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return
  // A collapsed cursor clears what the next typed letters would get
  if (selection.isCollapsed()) {
    selection.setFormat(0)
    selection.setStyle('')
    return
  }
  for (const node of selection.extract()) {
    if ($isTextNode(node)) {
      node.setFormat(0)
      node.setStyle('')
    }
  }
}
