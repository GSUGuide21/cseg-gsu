import { $createHorizontalRuleNode, $isHorizontalRuleNode, HorizontalRuleNode } from '@lexical/extension'
import { CHECK_LIST, registerMarkdownShortcuts, TRANSFORMERS, type ElementTransformer, type Transformer } from '@lexical/markdown'
import { mergeRegister } from '@lexical/utils'
import { COMMAND_PRIORITY_LOW, defineExtension, FORMAT_TEXT_COMMAND, KEY_DOWN_COMMAND, type LexicalEditor } from 'lexical'

import { $selectedBlock, BLOCK_ACTIONS } from './commands'
import { $faqAtSelection, $isFaqQuestionNode } from './nodes'
import { $setBlockType } from './tools'
import type { BlockType } from './types'

/** "---" on a line of its own is a divider */
const DIVIDER: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => ($isHorizontalRuleNode(node) ? '---' : null),
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parent, _children, _match, isImport) => {
    const rule = $createHorizontalRuleNode()
    if (isImport || parent.getNextSibling()) parent.replace(rule)
    else parent.insertBefore(rule)
    rule.selectNext()
  },
  type: 'element',
}

/** A question is a line of its own: "# " at the start of one is just what was typed */
const notInQuestion = <T extends Transformer>(transformer: T): T =>
  transformer.type === 'element' || transformer.type === 'multiline-element'
    ? ({
        ...transformer,
        replace: (parent: never, ...rest: never[]) => ($isFaqQuestionNode(parent) ? false : (transformer.replace as (...args: never[]) => boolean | void)(parent, ...rest)),
      } as T)
    : transformer

/** "[ ] " starts a checklist; CHECK_LIST is first so the list shortcuts don't take its "[" */
const SHORTCUTS = [CHECK_LIST, DIVIDER, ...TRANSFORMERS].map(notInQuestion)

const HEADING_KEYS: Record<string, BlockType> = { Digit0: 'paragraph', Digit1: 'h1', Digit2: 'h2', Digit3: 'h3', Digit4: 'h4' }
const LIST_KEYS: Record<string, BlockType> = { Digit7: 'number', Digit8: 'bullet', Digit9: 'check' }

const blockAction = (label: string) => BLOCK_ACTIONS.find((a) => a.label === label)!

/**
 * The keyboard's block tools: Alt+↑/↓ moves the block, Alt+Shift+↓ duplicates it, ⌘/Ctrl+Alt
 * 0–4 sets paragraph and headings, ⌘/Ctrl+Shift 7/8/9 numbers, bullets, and a checklist, and
 * ⌘/Ctrl+E and ⌘/Ctrl+Shift+X inline code and strikethrough. Runs inside the keydown's update.
 */
const $onKeyDown = (editor: LexicalEditor, event: KeyboardEvent) => {
  if (!editor.isEditable()) return false
  const mod = event.metaKey || event.ctrlKey
  const arrow = event.key === 'ArrowUp' || event.key === 'ArrowDown'

  if (event.altKey && !mod && arrow) {
    const block = $selectedBlock()
    const action = blockAction(event.shiftKey ? 'Duplicate' : event.key === 'ArrowUp' ? 'Move up' : 'Move down')
    if (!block || (event.shiftKey && event.key === 'ArrowUp')) return false
    event.preventDefault()
    if (action.$can?.(block) ?? true) action.$run(block)
    return true
  }
  if (!mod) return false

  const type = event.altKey && !event.shiftKey ? HEADING_KEYS[event.code] : event.shiftKey && !event.altKey ? LIST_KEYS[event.code] : undefined
  // A question stays a plain line, as in the toolbars
  if (type && !$faqAtSelection()?.inQuestion) {
    event.preventDefault()
    $setBlockType(editor, type)
    return true
  }
  const format = !event.altKey && !event.shiftKey && event.code === 'KeyE' ? 'code' : !event.altKey && event.shiftKey && event.code === 'KeyX' ? 'strikethrough' : null
  if (!format) return false
  event.preventDefault()
  editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
  return true
}

/** Writing without reaching for the tools: markdown as it's typed, and the keyboard's block tools */
export const EditingExtension = defineExtension({
  name: '@cseg/rich-text/editing',
  register: (editor) =>
    mergeRegister(
      registerMarkdownShortcuts(editor, SHORTCUTS),
      editor.registerCommand(KEY_DOWN_COMMAND, (event) => $onKeyDown(editor, event), COMMAND_PRIORITY_LOW)
    ),
})
