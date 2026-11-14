import { ListItemNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import { $getNodeByKey, $getSelection, $getState, $isRangeSelection, $setState, createState, defineExtension, ParagraphNode, type ElementNode, type LexicalNode } from 'lexical'

import { parseLineHeight, type LineHeight } from '@/lib/richtext/blocks'

/**
 * A block's line spacing, saved with it (under "$", as Lexical keeps state a node's class
 * doesn't declare). Lexical saves no style for a block of its own, only for its text, so
 * this is how a paragraph keeps its spacing.
 */
export const lineHeightState = createState('lineHeight', { parse: parseLineHeight })

/** The blocks spacing applies to: the ones that hold lines of text */
const SPACED = [ParagraphNode, HeadingNode, QuoteNode, ListItemNode]
const isSpaced = (node: LexicalNode): node is ElementNode => SPACED.some((K) => node instanceof K)

/** The blocks the selection touches, each once */
const $selectedBlocks = (): ElementNode[] => {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return []
  const blocks = new Map<string, ElementNode>()
  for (const node of [selection.anchor.getNode(), ...selection.getNodes()]) {
    const block = isSpaced(node) ? node : $findMatchingParent(node, isSpaced)
    if (block) blocks.set(block.getKey(), block as ElementNode)
  }
  return [...blocks.values()]
}

/** Sets the spacing of every block the selection touches; "" puts back the usual */
export const $setLineHeight = (value: LineHeight | '') => {
  for (const block of $selectedBlocks()) $setState(block, lineHeightState, value)
}

/** The spacing of the block the cursor's in ("" for the usual) */
export const $lineHeightAtSelection = (): LineHeight | '' => {
  const [block] = $selectedBlocks()
  return block ? $getState(block, lineHeightState) : ''
}

/** Draws each block's spacing in the editor, as it'll show on the site */
export const LineHeightExtension = defineExtension({
  name: '@cseg/rich-text/line-height',
  register: (editor) =>
    mergeRegister(
      ...SPACED.map((K) =>
        editor.registerMutationListener(
          K,
          (mutations) =>
            editor.getEditorState().read(() => {
              for (const [key, mutation] of mutations) {
                if (mutation === 'destroyed') continue
                const element = editor.getElementByKey(key)
                const node = $getNodeByKey(key)
                if (element && node) element.style.lineHeight = $getState(node, lineHeightState)
              }
            }),
          { skipInitialization: false }
        )
      )
    ),
})
