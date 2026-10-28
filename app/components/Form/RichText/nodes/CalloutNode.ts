import {
  $create,
  $createParagraphNode,
  $getDocument,
  $getState,
  $getStateChange,
  $setState,
  createState,
  ElementNode,
  type DOMConversionOutput,
  type DOMExportOutput,
  type ElementDOMSlot,
  type LexicalNode,
  type RangeSelection,
} from 'lexical'
import type { IconNode } from 'lucide-react'

import { CALLOUT_TONES, calloutClasses, parseTone, type CalloutTone } from '@/lib/richtext/blocks'

const SVG = 'http://www.w3.org/2000/svg'

/** A Lucide icon drawn without React, with Lucide's own stroke settings */
export const iconElement = (icon: IconNode) => {
  const doc = $getDocument()
  const svg = doc.createElementNS(SVG, 'svg')
  const attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v)
  for (const [tag, props] of icon) {
    const el = doc.createElementNS(SVG, tag)
    for (const [k, v] of Object.entries(props)) if (k !== 'key') el.setAttribute(k, String(v))
    svg.append(el)
  }
  return svg
}

/** Saved flat, as "tone" next to "type"; left out when it's "info" */
const toneState = createState('tone', { parse: parseTone })

/**
 * A callout: a tinted note with an icon (lib/richtext/blocks/callout). It holds a line of
 * text like a quote does: Shift+Enter for a new line, Enter to carry on below it, and
 * Backspace at its start turns it back into a paragraph.
 */
export class CalloutNode extends ElementNode {
  $config() {
    return this.config('callout', {
      extends: ElementNode,
      stateConfigs: [{ flat: true, stateConfig: toneState }],
      importDOM: {
        aside: (el: HTMLElement) => (el.hasAttribute('data-callout') ? { conversion: $convertCallout, priority: 1 } : null),
      },
    })
  }

  getTone(): CalloutTone {
    return $getState(this, toneState)
  }

  setTone(tone: CalloutTone): this {
    return $setState(this, toneState, tone)
  }

  createDOM(): HTMLElement {
    const tone = this.getTone()
    const c = calloutClasses(tone)
    const doc = $getDocument()
    const box = doc.createElement('div')
    box.className = c.box
    box.setAttribute('role', 'note')
    box.setAttribute('aria-label', CALLOUT_TONES[tone].label)
    const tile = doc.createElement('span')
    tile.className = c.tile
    tile.contentEditable = 'false'
    tile.setAttribute('aria-hidden', 'true')
    tile.append(iconElement(CALLOUT_TONES[tone].icon))
    const body = doc.createElement('div')
    body.className = c.body
    body.dataset.calloutBody = ''
    box.append(tile, body)
    return box
  }

  /** The text goes in the body, beside the icon */
  getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLElement> {
    const body = element.querySelector<HTMLElement>(':scope > [data-callout-body]')
    return body ? super.getDOMSlot(element).withElement(body) : super.getDOMSlot(element)
  }

  /**
   * A new tone is drawn fresh: its colors and icon. ($getState reads a node's latest
   * version, which would make the old node report the new tone, so compare the two as they are.)
   */
  updateDOM(prevNode: this): boolean {
    return $getStateChange(this, prevNode, toneState) !== null
  }

  exportDOM(): DOMExportOutput {
    const aside = $getDocument().createElement('aside')
    aside.setAttribute('data-callout', this.getTone())
    aside.setAttribute('role', 'note')
    return { element: aside }
  }

  insertNewAfter(selection: RangeSelection, restoreSelection?: boolean) {
    const paragraph = $createParagraphNode()
    paragraph.setTextFormat(selection.format)
    paragraph.setTextStyle(selection.style)
    this.insertAfter(paragraph, restoreSelection)
    return paragraph
  }

  collapseAtStart(): true {
    const paragraph = $createParagraphNode()
    for (const child of this.getChildren()) paragraph.append(child)
    this.replace(paragraph)
    return true
  }
}

function $convertCallout(el: HTMLElement): DOMConversionOutput {
  return { node: $createCalloutNode(parseTone(el.getAttribute('data-callout'))) }
}

export function $createCalloutNode(tone: CalloutTone = 'info'): CalloutNode {
  return $create(CalloutNode).setTone(tone)
}

export function $isCalloutNode(node: LexicalNode | null | undefined): node is CalloutNode {
  return node instanceof CalloutNode
}
