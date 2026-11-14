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
  $mergeCells,
  $unmergeCell,
  type TableCellNode,
  $setTableColumnIsHeader,
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

/** The cells selected across (a drag, or Shift+click), or the one the cursor's in */
const $selectedCells = (): TableCellNode[] => {
  const selection = $getSelection()
  if ($isTableSelection(selection)) return selection.getNodes().filter($isTableCellNode)
  if (!$isRangeSelection(selection)) return []
  const cell = $getTableCellNodeFromLexicalNode(selection.anchor.getNode())
  return cell ? [cell] : []
}

/** The selected cells as one; nothing happens with only one selected */
export const $mergeSelectedCells = () => {
  const cells = $selectedCells()
  if (cells.length > 1) $mergeCells(cells)
}

/** A merged cell back into the cells it was */
export const $splitMergedCell = () => {
  const [cell] = $selectedCells()
  if (cell && (cell.getColSpan() > 1 || cell.getRowSpan() > 1)) $unmergeCell()
}

/** The selected cells' background (null for none) */
export const $setCellBackground = (color: string | null) => {
  for (const cell of $selectedCells()) cell.setBackgroundColor(color)
}

/** The background of the cell the cursor's in ("" for none) */
export const $cellBackgroundAtSelection = () => $selectedCells()[0]?.getBackgroundColor() ?? ''

/** Whether the cursor's table has a header column: every row's first cell is a header */
export const $hasHeaderColumn = () => {
  const rows = $selectedTable()?.getChildren().filter($isTableRowNode) ?? []
  return rows.length > 0 && rows.every((row) => {
    const first = row.getFirstChild()
    return $isTableCellNode(first) && first.hasHeaderState(TableCellHeaderStates.COLUMN)
  })
}

/** Turns the first column of the cursor's table into headers, or back */
export const $toggleHeaderColumn = () => {
  const table = $selectedTable()
  if (table) $setTableColumnIsHeader(table, 0, !$hasHeaderColumn())
}

/** Whether the cursor's table shades every other row */
export const $hasRowStriping = () => $selectedTable()?.getRowStriping() ?? false

/** Shades every other row of the cursor's table, or stops */
export const $toggleRowStriping = () => {
  const table = $selectedTable()
  if (table) table.setRowStriping(!table.getRowStriping())
}

/** The cursor's table's columns back to sharing its width equally */
export const $evenColumns = () => $selectedTable()?.setColWidths(undefined)

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/**
 * The rows of the cursor's table in order of the cursor's column, A to Z (or Z to A),
 * numbers by their value. A header row stays on top, and empty cells go last. A table with
 * merged cells is left as it is: its rows can't be moved apart.
 */
export const $sortTableByColumn = (direction: 'asc' | 'desc') => {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return
  const cell = $getTableCellNodeFromLexicalNode(selection.anchor.getNode())
  const table = cell ? $getTableNodeFromLexicalNodeOrThrow(cell) : null
  if (!cell || !table) return
  const rows = table.getChildren().filter($isTableRowNode)
  const cells = rows.flatMap((row) => row.getChildren().filter($isTableCellNode))
  if (cells.some((c) => c.getColSpan() > 1 || c.getRowSpan() > 1)) return
  const column = cell.getIndexWithinParent()
  const isHeader = (row: (typeof rows)[number]) => row.getChildren().every((c) => $isTableCellNode(c) && c.hasHeaderState(TableCellHeaderStates.ROW))
  let top = 0
  while (top < rows.length && isHeader(rows[top])) top++
  const textOf = (row: (typeof rows)[number]) => row.getChildAtIndex(column)?.getTextContent().trim() ?? ''
  const body = rows.slice(top).sort((a, b) => {
    const x = textOf(a)
    const y = textOf(b)
    if (!x || !y) return x ? -1 : y ? 1 : 0
    return direction === 'asc' ? collator.compare(x, y) : collator.compare(y, x)
  })
  // Copies in the new order, in place of the rows: moving rows' elements about loses the
  // browser's selection, and the editor would put the cursor back at the top of the table
  const cursorRow = cell.getParent()
  let cursorCell: LexicalNode | null = null
  for (const row of body) {
    const copy = $parseSerializedNode(serialized(row))
    if (row.is(cursorRow) && $isElementNode(copy)) cursorCell = copy.getChildAtIndex(column)
    row.remove()
    table.append(copy)
  }
  // The cursor stays in its cell (now in its row's new place), so sorting again uses the same column
  if ($isTableCellNode(cursorCell)) cursorCell.selectStart()
}

/** The table the cursor is in, taken out whole */
export const $deleteTableAtSelection = () => $selectedTable()?.remove()

/** What can be done to a table from the toolbar or the context menu; each runs inside editor.update */
export const TABLE_ACTIONS: { label: string; danger?: boolean; $run: () => void }[] = [
  { label: 'Insert row above', $run: () => $insertTableRowAtSelection(false) },
  { label: 'Insert row below', $run: () => $insertTableRowAtSelection(true) },
  { label: 'Insert column left', $run: () => $insertTableColumnAtSelection(false) },
  { label: 'Insert column right', $run: () => $insertTableColumnAtSelection(true) },
  { label: 'Merge selected cells', $run: () => $mergeSelectedCells() },
  { label: 'Split merged cell', $run: () => $splitMergedCell() },
  { label: 'Sort A to Z by this column', $run: () => $sortTableByColumn('asc') },
  { label: 'Sort Z to A by this column', $run: () => $sortTableByColumn('desc') },
  { label: 'Make columns even', $run: () => $evenColumns() },
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
