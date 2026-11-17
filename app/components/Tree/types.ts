import type { ReactNode } from 'react'

export interface TreeNode {
  /** Stable and unique across the whole tree */
  id: string
  label: ReactNode
  /** The label in plain words, when `label` isn't text: read by screen readers, and what typing a letter matches */
  textValue?: string
  /** Shown before the label: a folder, a file, a page */
  icon?: ReactNode
  /** Shown at the end of the row: a count, a badge */
  meta?: ReactNode
  /** Makes the row a link; Enter or a click follows it */
  href?: string
  disabled?: boolean
  /** What sits under this one. A node with children opens and closes. */
  children?: readonly TreeNode[]
}

export interface TreeProps {
  nodes: readonly TreeNode[]
  /** Names the tree for screen readers ("Pages"); or point `aria-labelledby` at a heading */
  'aria-label'?: string
  'aria-labelledby'?: string
  /** Ids of the nodes that are open. Leave out to let the tree keep track itself. */
  expanded?: readonly string[]
  /** Open at first, when the tree keeps track itself; "all" opens every branch */
  defaultExpanded?: readonly string[] | 'all'
  onExpandedChange?: (expanded: string[]) => void
  /** The id of the picked node. Leave out to let the tree keep track itself. */
  selected?: string | null
  defaultSelected?: string | null
  /** Called when a node is picked (clicked, or Enter or Space on it) */
  onSelect?: (id: string, node: TreeNode) => void
  /** Whether rows can be picked at all. Default true; false leaves a tree that only opens and closes. */
  selectable?: boolean
  /** Row height and text size. Default "md". */
  size?: 'sm' | 'md'
  /** Draw a line down each open branch, joining its children. Default true. */
  guides?: boolean
  className?: string
}
