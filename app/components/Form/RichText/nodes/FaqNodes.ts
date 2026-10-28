import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getDocument,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  ElementNode,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  type DOMExportOutput,
  type ElementDOMSlot,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical'

import { faqClasses } from '@/lib/richtext/blocks'

import { iconElement } from './CalloutNode'

/**
 * An FAQ typed in place: questions that open to their answers on the site.
 *
 *   faq                 the list (FaqNode)
 *     faq-item          one question and its answer (FaqItemNode)
 *       faq-question    a line of text (FaqQuestionNode)
 *       faq-answer      paragraphs, lists, links… (FaqAnswerNode)
 *
 * Enter in a question goes to its answer; Enter on an empty last line of an answer starts
 * the next question; Enter in a new, empty question leaves the FAQ. Backspace in an empty
 * question takes it out. Transforms keep the shape whatever an edit or a paste does.
 */

const CHEVRON = [['path', { d: 'm6 9 6 6 6-6' }]] as const

/** A placeholder shown in an empty question or answer (CSS, so it's never part of the text) */
const placeholder = (text: string) => (el: HTMLElement) => {
  el.dataset.placeholder = text
  return el
}
const placeholderClass =
  '[&:has(>br:only-child)]:before:pointer-events-none [&:has(>br:only-child)]:before:float-left [&:has(>br:only-child)]:before:font-normal [&:has(>br:only-child)]:before:text-ink-faint [&:has(>br:only-child)]:before:content-[attr(data-placeholder)]'
/** An empty answer is one empty paragraph */
const answerPlaceholderClass =
  "[&>p:only-child:has(>br:only-child)]:before:pointer-events-none [&>p:only-child:has(>br:only-child)]:before:float-left [&>p:only-child:has(>br:only-child)]:before:text-ink-faint [&>p:only-child:has(>br:only-child)]:before:content-['Answer']"

export class FaqNode extends ElementNode {
  $config() {
    return this.config('faq', {
      extends: ElementNode,
      importDOM: {
        div: (el: HTMLElement) => (el.hasAttribute('data-faq') ? { conversion: () => ({ node: $createFaqNode() }), priority: 2 } : null),
      },
    })
  }

  createDOM(): HTMLElement {
    const div = $getDocument().createElement('div')
    div.className = faqClasses.list
    return div
  }

  updateDOM(): false {
    return false
  }

  exportDOM(): DOMExportOutput {
    const div = $getDocument().createElement('div')
    div.setAttribute('data-faq', '')
    return { element: div }
  }

  canBeEmpty(): false {
    return false
  }

  canIndent(): false {
    return false
  }
}

export class FaqItemNode extends ElementNode {
  $config() {
    return this.config('faq-item', {
      extends: ElementNode,
      importDOM: { details: () => ({ conversion: () => ({ node: $create(FaqItemNode) }), priority: 1 }) },
    })
  }

  createDOM(): HTMLElement {
    const div = $getDocument().createElement('div')
    div.className = faqClasses.itemOpen
    return div
  }

  updateDOM(): false {
    return false
  }

  exportDOM(): DOMExportOutput {
    return { element: $getDocument().createElement('details') }
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

  getQuestion(): FaqQuestionNode | null {
    const first = this.getFirstChild()
    return $isFaqQuestionNode(first) ? first : null
  }

  getAnswer(): FaqAnswerNode | null {
    const answer = this.getChildren().find($isFaqAnswerNode)
    return answer ?? null
  }
}

export class FaqQuestionNode extends ElementNode {
  $config() {
    return this.config('faq-question', {
      extends: ElementNode,
      importDOM: { summary: () => ({ conversion: () => ({ node: $create(FaqQuestionNode) }), priority: 1 }) },
    })
  }

  /** A row: the question's words, then the chevron (not part of the text) */
  createDOM(): HTMLElement {
    const doc = $getDocument()
    const row = doc.createElement('div')
    row.className = faqClasses.questionRow
    const text = placeholder('Question')(doc.createElement('div'))
    text.className = `${faqClasses.question} ${placeholderClass}`
    text.dataset.faqQuestion = ''
    const chevron = doc.createElement('span')
    chevron.className = faqClasses.chevron
    chevron.contentEditable = 'false'
    chevron.setAttribute('aria-hidden', 'true')
    const svg = iconElement(CHEVRON as never)
    svg.setAttribute('width', '16')
    svg.setAttribute('height', '16')
    chevron.append(svg)
    row.append(text, chevron)
    return row
  }

  getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLElement> {
    const text = element.querySelector<HTMLElement>(':scope > [data-faq-question]')
    return text ? super.getDOMSlot(element).withElement(text) : super.getDOMSlot(element)
  }

  updateDOM(): false {
    return false
  }

  exportDOM(): DOMExportOutput {
    return { element: $getDocument().createElement('summary') }
  }

  canIndent(): false {
    return false
  }

  /** Enter is handled by the FAQ's own key handling; this is only a fallback */
  insertNewAfter(): LexicalNode | null {
    const answer = this.getParent<FaqItemNode>()?.getAnswer()
    const first = answer?.getFirstChild()
    return $isElementNode(first) ? first : null
  }

  /** Backspace at the very start: nothing to merge into */
  collapseAtStart(): boolean {
    return true
  }
}

export class FaqAnswerNode extends ElementNode {
  $config() {
    return this.config('faq-answer', { extends: ElementNode })
  }

  createDOM(): HTMLElement {
    const div = $getDocument().createElement('div')
    div.className = `${faqClasses.answer} ${answerPlaceholderClass}`
    return div
  }

  updateDOM(): false {
    return false
  }

  exportDOM(): DOMExportOutput {
    return { element: $getDocument().createElement('div') }
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

export const $isFaqNode = (node: LexicalNode | null | undefined): node is FaqNode => node instanceof FaqNode
export const $isFaqItemNode = (node: LexicalNode | null | undefined): node is FaqItemNode => node instanceof FaqItemNode
export const $isFaqQuestionNode = (node: LexicalNode | null | undefined): node is FaqQuestionNode => node instanceof FaqQuestionNode
export const $isFaqAnswerNode = (node: LexicalNode | null | undefined): node is FaqAnswerNode => node instanceof FaqAnswerNode

/** One question and its (empty) answer */
export function $createFaqItemNode(question = ''): FaqItemNode {
  const q = $create(FaqQuestionNode)
  if (question) q.append($createTextNode(question))
  return $create(FaqItemNode).append(q, $create(FaqAnswerNode).append($createParagraphNode()))
}

/** An FAQ with one empty question, ready to type into */
export function $createFaqNode(): FaqNode {
  return $create(FaqNode)
}

export const $newFaq = () => $createFaqNode().append($createFaqItemNode())

/** The FAQ part the cursor's in, if any */
export function $faqAtSelection() {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return null
  const anchor = selection.anchor.getNode()
  const item = $findMatchingParent(anchor, $isFaqItemNode)
  if (!$isFaqItemNode(item)) return null
  const question = $findMatchingParent(anchor, $isFaqQuestionNode)
  return { selection, anchor, item, faq: item.getParent<FaqNode>(), inQuestion: $isFaqQuestionNode(question) }
}

/** Puts the cursor in a question */
const $focusQuestion = (item: FaqItemNode, at: 'start' | 'end' = 'start') => {
  const q = item.getQuestion()
  if (at === 'start') q?.selectStart()
  else q?.selectEnd()
}

/** Puts the cursor at the end of an answer */
const $focusAnswerEnd = (item: FaqItemNode) => {
  const last = item.getAnswer()?.getLastDescendant()
  if (last) last.selectEnd()
  else item.getAnswer()?.selectEnd()
}

/** A new question after this one, with the cursor in it */
export function $addFaqItemAfter(item: FaqItemNode) {
  const next = $createFaqItemNode()
  item.insertAfter(next)
  $focusQuestion(next)
  return next
}

/** Takes a question (and its answer) out; with none left, the FAQ goes, leaving a paragraph */
export function $removeFaqItem(item: FaqItemNode) {
  const faq = item.getParent()
  const prev = item.getPreviousSibling()
  const next = item.getNextSibling()
  item.remove()
  if ($isFaqNode(faq) && faq.getChildrenSize() === 0) {
    const paragraph = $createParagraphNode()
    faq.replace(paragraph)
    paragraph.selectStart()
  } else if ($isFaqItemNode(prev)) $focusAnswerEnd(prev)
  else if ($isFaqItemNode(next)) $focusQuestion(next)
}

/** Takes the whole FAQ out, leaving a paragraph where it was */
export function $removeFaq(faq: FaqNode) {
  const paragraph = $createParagraphNode()
  faq.replace(paragraph)
  paragraph.selectStart()
}

/** A paragraph after the FAQ, with the cursor in it (leaving the FAQ from its last question) */
const $exitAfter = (faq: FaqNode) => {
  const next = faq.getNextSibling()
  if ($isParagraphNode(next) && next.isEmpty()) return next.selectStart()
  const paragraph = $createParagraphNode()
  faq.insertAfter(paragraph)
  paragraph.selectStart()
}

const isBlank = (node: LexicalNode | null | undefined) => !node || node.getTextContent().trim() === ''

/** The block in an answer the cursor's in: a direct child of the answer */
const $answerBlock = (anchor: LexicalNode) => $findMatchingParent(anchor, (n) => $isFaqAnswerNode(n.getParent()))

/** Enter: into the answer, on to the next question, or out of the FAQ */
const $onEnter = (event: KeyboardEvent | null) => {
  if (event?.shiftKey) return false
  const at = $faqAtSelection()
  if (!at || !at.selection.isCollapsed()) return false
  const { item, faq, anchor, inQuestion } = at
  const answer = item.getAnswer()
  if (inQuestion) {
    // A new question left empty, with nothing in its answer: leave the FAQ
    if (isBlank(item.getQuestion()) && isBlank(answer) && $isFaqNode(faq) && !item.getNextSibling()) {
      item.remove()
      if (faq.getChildrenSize() === 0) $removeFaq(faq)
      else $exitAfter(faq)
    } else {
      const first = answer?.getFirstChild()
      if ($isElementNode(first)) first.selectStart()
      else answer?.append($createParagraphNode()).selectStart()
    }
    event?.preventDefault()
    return true
  }
  // In the answer: only an empty last line does anything special
  const block = $answerBlock(anchor)
  if (!$isParagraphNode(block) || !block.isEmpty() || block.getNextSibling()) return false
  if (answer && answer.getChildrenSize() > 1) block.remove()
  $addFaqItemAfter(item)
  event?.preventDefault()
  return true
}

/** Backspace at the start of a question: take out an empty one, or step back into the answer above */
const $onBackspace = (event: KeyboardEvent | null) => {
  const at = $faqAtSelection()
  if (!at || !at.inQuestion || !at.selection.isCollapsed() || at.selection.anchor.offset !== 0) return false
  const { item, selection } = at
  // Only at the very start of the question: in it while it's empty, or at its first word
  const q = item.getQuestion()
  const node = selection.anchor.getNode()
  if (!q || !(node.is(q) || node.is(q.getFirstDescendant()))) return false
  if (isBlank(q) && isBlank(item.getAnswer())) $removeFaqItem(item)
  else {
    const prev = item.getPreviousSibling()
    if (!$isFaqItemNode(prev)) return false
    $focusAnswerEnd(prev)
  }
  event?.preventDefault()
  return true
}

/** Keeps every FAQ in shape, whatever an edit, an undo, or a paste leaves */
export function registerFaq(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerNodeTransform(FaqNode, (faq) => {
      // Only questions inside; anything else goes into the answer above it, or a new question's
      for (const child of faq.getChildren()) {
        if ($isFaqItemNode(child)) continue
        const prev = child.getPreviousSibling()
        let item = $isFaqItemNode(prev) ? prev : null
        if (!item) {
          item = $createFaqItemNode()
          child.insertBefore(item)
        }
        item.getAnswer()?.append($isElementNode(child) && !child.isInline() ? child : $createParagraphNode().append(child))
      }
      if (faq.getChildrenSize() === 0) faq.remove()
    }),
    editor.registerNodeTransform(FaqItemNode, (item) => {
      const parent = item.getParent()
      // A question outside an FAQ (pasted on its own) gets one around it
      if (!$isFaqNode(parent)) {
        const faq = $createFaqNode()
        item.insertBefore(faq)
        faq.append(item)
        return
      }
      let question = item.getQuestion()
      if (!question) {
        question = $create(FaqQuestionNode)
        const first = item.getFirstChild()
        if (first) first.insertBefore(question)
        else item.append(question)
      }
      let answer = item.getAnswer()
      if (!answer) {
        answer = $create(FaqAnswerNode)
        item.append(answer)
      }
      if (answer.getPreviousSibling() !== question) question.insertAfter(answer)
      // Anything else in the item belongs in the answer
      for (const child of item.getChildren()) {
        if (child.is(question) || child.is(answer)) continue
        if ($isFaqQuestionNode(child) || $isFaqAnswerNode(child)) {
          answer.append(...child.getChildren())
          child.remove()
        } else answer.append($isElementNode(child) && !child.isInline() ? child : $createParagraphNode().append(child))
      }
    }),
    editor.registerNodeTransform(FaqQuestionNode, (question) => {
      if (!$isFaqItemNode(question.getParent())) {
        const paragraph = $createParagraphNode().append(...question.getChildren())
        question.replace(paragraph)
        return
      }
      // A question is one line: blocks pasted in give up their words
      for (const child of question.getChildren()) {
        if ($isElementNode(child) && !child.isInline()) {
          child.insertBefore($createTextNode(' '))
          for (const grand of child.getChildren()) child.insertBefore(grand)
          child.remove()
        }
      }
    }),
    editor.registerNodeTransform(FaqAnswerNode, (answer) => {
      if (!$isFaqItemNode(answer.getParent())) {
        for (const child of answer.getChildren()) answer.insertBefore(child)
        answer.remove()
        return
      }
      if (answer.getChildrenSize() === 0) answer.append($createParagraphNode())
      // Words straight in the answer go in a paragraph
      for (const child of answer.getChildren()) {
        if (!$isElementNode(child) || child.isInline()) {
          const paragraph = $createParagraphNode()
          child.insertBefore(paragraph)
          paragraph.append(child)
        }
      }
    }),
    editor.registerCommand(KEY_ENTER_COMMAND, $onEnter, COMMAND_PRIORITY_LOW),
    editor.registerCommand(KEY_BACKSPACE_COMMAND, $onBackspace, COMMAND_PRIORITY_LOW)
  )
}

// ── FAQs saved as data, from before they were typed in place ─────────────────

type JSONNode = Record<string, unknown> & { type: string; children?: JSONNode[] }

const textJSON = (text: string, format = 0): JSONNode => ({ type: 'text', version: 1, text, format, style: '', mode: 'normal', detail: 0 })
const elementJSON = (type: string, children: JSONNode[], extra: Record<string, unknown> = {}): JSONNode => ({
  type,
  version: 1,
  children,
  direction: null,
  format: '',
  indent: 0,
  ...extra,
})

/** "**bold** and [a link](/x)" as Lexical's JSON: bold text, and a link */
const inlineJSON = (text: string): JSONNode[] => {
  const out: JSONNode[] = []
  let at = 0
  for (const m of text.matchAll(/\*\*(.+?)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g)) {
    if (m.index > at) out.push(textJSON(text.slice(at, m.index)))
    if (m[1] !== undefined) out.push(textJSON(m[1], 1))
    else out.push(elementJSON('link', [textJSON(m[2])], { url: m[3], rel: null, target: null, title: null }))
    at = m.index + m[0].length
  }
  if (at < text.length) out.push(textJSON(text.slice(at)))
  return out
}

/** An FAQ saved as { type: 'faq', items: [{ q, a }] }, as the questions-and-answers it now is */
const migrateNode = (node: JSONNode): JSONNode => {
  if (node.type === 'faq' && Array.isArray(node.items) && !node.children?.length) {
    const items = (node.items as { q?: unknown; a?: unknown }[]).filter((i) => typeof i?.q === 'string' && i.q.trim())
    return elementJSON(
      'faq',
      items.map((i) =>
        elementJSON('faq-item', [
          elementJSON('faq-question', [textJSON(String(i.q))]),
          elementJSON(
            'faq-answer',
            (typeof i.a === 'string' && i.a.trim() ? i.a.split(/\n{2,}/) : ['']).map((para) => elementJSON('paragraph', inlineJSON(para.replace(/\n/g, ' ')), { textFormat: 0, textStyle: '' }))
          ),
        ])
      )
    )
  }
  return node.children ? { ...node, children: node.children.map(migrateNode) } : node
}

/** Saved editor JSON with any data-form FAQs turned into typed-in-place ones */
export const migrateFaqJSON = (json: string): string => {
  if (!json.includes('"faq"') || !json.includes('"items"')) return json
  try {
    const state = JSON.parse(json) as { root: JSONNode }
    return JSON.stringify({ ...state, root: migrateNode(state.root) })
  } catch {
    return json
  }
}
