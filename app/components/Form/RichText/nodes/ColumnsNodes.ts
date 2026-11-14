import {
  $create,
  $createParagraphNode,
  $getDocument,
  $getState,
  $getStateChange,
  $isElementNode,
  $setState,
  createState,
  ElementNode,
  type DOMConversionOutput,
  type DOMExportOutput,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical'
import { mergeRegister } from '@lexical/utils'

import { COLUMN_LAYOUTS, columnsClasses, parseColumnsLayout, type ColumnsLayout } from '@/lib/richtext/blocks'

/** Saved flat, as "layout" next to "type"; left out when it's two equal columns */
const layoutState = createState('layout', { parse: parseColumnsLayout })

/**
 * Columns: a row of two or three (lib/richtext/blocks/columns), each a Column holding its
 * own blocks. The row is one block to the gutter and the keyboard (moved, duplicated, and
 * deleted whole); inside, each column is written in like the page itself.
 */
export class ColumnsNode extends ElementNode {
  $config() {
    return this.config('columns', {
      extends: ElementNode,
      stateConfigs: [{ flat: true, stateConfig: layoutState }],
      importDOM: {
        div: (el: HTMLElement) => (el.hasAttribute('data-columns') ? { conversion: $convertColumns, priority: 2 } : null),
      },
    })
  }

  getLayout(): ColumnsLayout {
    return $getState(this, layoutState)
  }

  setLayout(layout: ColumnsLayout): this {
    return $setState(this, layoutState, layout)
  }

  createDOM(): HTMLElement {
    const row = $getDocument().createElement('div')
    row.className = columnsClasses(this.getLayout(), true).row
    return row
  }

  /** A new layout is drawn fresh: its widths ($getState reads the latest version, so compare the two as they are) */
  updateDOM(prevNode: this): boolean {
    return $getStateChange(this, prevNode, layoutState) !== null
  }

  exportDOM(): DOMExportOutput {
    const row = $getDocument().createElement('div')
    row.setAttribute('data-columns', this.getLayout())
    return { element: row }
  }

  canBeEmpty(): false {
    return false
  }

  canIndent(): false {
    return false
  }
}

/** One column of a row. Its blocks are its own: Enter, lists, and backspace stay inside it. */
export class ColumnNode extends ElementNode {
  $config() {
    return this.config('column', {
      extends: ElementNode,
      importDOM: {
        div: (el: HTMLElement) => (el.hasAttribute('data-column') ? { conversion: () => ({ node: $create(ColumnNode) }), priority: 2 } : null),
      },
    })
  }

  createDOM(): HTMLElement {
    const column = $getDocument().createElement('div')
    column.className = columnsClasses('1-1', true).column
    return column
  }

  updateDOM(): false {
    return false
  }

  exportDOM(): DOMExportOutput {
    const column = $getDocument().createElement('div')
    column.setAttribute('data-column', '')
    return { element: column }
  }

  isShadowRoot(): true {
    return true
  }

  canBeEmpty(): false {
    return false
  }

  canIndent(): false {
    return false
  }
}

function $convertColumns(el: HTMLElement): DOMConversionOutput {
  return { node: $create(ColumnsNode).setLayout(parseColumnsLayout(el.getAttribute('data-columns'))) }
}

export const $isColumnsNode = (node: LexicalNode | null | undefined): node is ColumnsNode => node instanceof ColumnsNode
export const $isColumnNode = (node: LexicalNode | null | undefined): node is ColumnNode => node instanceof ColumnNode

const $newColumn = () => $create(ColumnNode).append($createParagraphNode())

/** A row of empty columns, each with a line to type on */
export function $createColumnsNode(layout: ColumnsLayout = '1-1'): ColumnsNode {
  const row = $create(ColumnsNode).setLayout(layout)
  for (let i = 0; i < COLUMN_LAYOUTS[layout].count; i++) row.append($newColumn())
  return row
}

/** The row of columns the node is in, if it's in one */
export const $columnsAround = (node: LexicalNode | null): ColumnsNode | null => {
  for (let at: LexicalNode | null = node; at; at = at.getParent()) if ($isColumnsNode(at)) return at
  return null
}

/**
 * A row with another layout: a column is added on the end when the new one has more, and
 * when it has fewer, the extra columns' writing moves into the last one that's kept
 */
export const $setColumnsLayout = (row: ColumnsNode, layout: ColumnsLayout) => {
  row.setLayout(layout)
  const want = COLUMN_LAYOUTS[layout].count
  const columns = row.getChildren().filter($isColumnNode)
  for (let i = columns.length; i < want; i++) row.append($newColumn())
  const last = columns[want - 1]
  for (const extra of columns.slice(want)) {
    last?.append(...extra.getChildren())
    extra.remove()
  }
}

/** The columns' writing put back in the page, one after another, in place of the row */
export const $removeColumns = (row: ColumnsNode) => {
  for (const column of row.getChildren()) {
    for (const child of $isElementNode(column) ? column.getChildren() : [column]) row.insertBefore(child)
  }
  row.remove()
}

/**
 * Keeps rows of columns whole: a row holds only columns (as many as its layout has), a
 * column is never empty and never outside a row, and there's always a line to type on
 * after a row, so the cursor can get below one at the end of the page.
 */
export const registerColumns = (editor: LexicalEditor) =>
  mergeRegister(
    editor.registerNodeTransform(ColumnsNode, (row) => {
      // Columns don't go inside columns: one pasted into a column gives up its writing
      if ($isColumnNode(row.getParent())) return $removeColumns(row)
      const columns = row.getChildren().filter($isColumnNode)
      // Anything else that ended up in the row belongs in a column
      for (const child of row.getChildren()) {
        if ($isColumnNode(child)) continue
        const home = columns[columns.length - 1]
        if (home) home.append($isElementNode(child) && !child.isInline() ? child : $createParagraphNode().append(child))
        else row.insertBefore(child)
      }
      if (!columns.length) return row.remove()
      const want = COLUMN_LAYOUTS[row.getLayout()].count
      if (columns.length !== want) $setColumnsLayout(row, row.getLayout())
      if (!row.getNextSibling()) row.insertAfter($createParagraphNode())
    }),
    editor.registerNodeTransform(ColumnNode, (column) => {
      if (!$isColumnsNode(column.getParent())) {
        for (const child of column.getChildren()) column.insertBefore(child)
        column.remove()
        return
      }
      if (column.getChildrenSize() === 0) column.append($createParagraphNode())
      // Words straight in the column go in a paragraph
      for (const child of column.getChildren()) {
        if (!$isElementNode(child) || child.isInline()) {
          const paragraph = $createParagraphNode()
          child.insertBefore(paragraph)
          paragraph.append(child)
        }
      }
    })
  )
