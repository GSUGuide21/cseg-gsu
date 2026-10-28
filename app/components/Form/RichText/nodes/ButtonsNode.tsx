'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $create,
  $getDocument,
  $getNodeByKey,
  $getState,
  $setState,
  createState,
  DecoratorNode,
  type DOMConversionOutput,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
} from 'lexical'
import { useCallback, useState, type FC, type ReactNode } from 'react'

import { ButtonRow, parseAlign, parseButtons } from '@/lib/richtext/blocks'

import { BlockFrame } from './BlockFrame'
import { ButtonsDialog, type ButtonsData } from './ButtonsDialog'

/** Saved flat: { type: 'buttons', buttons: [{ label, href, style }], align } */
const buttonsState = createState('buttons', { parse: parseButtons })
const alignState = createState('align', { parse: parseAlign })

const ButtonsBlock: FC<{ nodeKey: NodeKey; data: ButtonsData }> = ({ nodeKey, data }) => {
  const [editor] = useLexicalComposerContext()
  const [editing, setEditing] = useState(false)
  const edit = useCallback(() => setEditing(true), [])
  return (
    <BlockFrame nodeKey={nodeKey} label="Buttons" onEdit={edit}>
      {/* Look-alikes: a click here selects the block rather than following the link */}
      <div className="py-px">
        {data.buttons.length ? (
          <ButtonRow buttons={data.buttons} align={data.align} preview />
        ) : (
          <div className="my-4 rounded-lg border border-dashed border-line px-4 py-3 text-[0.85rem] text-muted">No buttons yet</div>
        )}
      </div>
      <ButtonsDialog
        open={editing}
        initial={data}
        onClose={() => {
          setEditing(false)
          editor.focus()
        }}
        onSave={(next) => {
          setEditing(false)
          editor.update(() => {
            const node = $getNodeByKey(nodeKey)
            if ($isButtonsNode(node)) node.setData(next)
          })
          editor.focus()
        }}
      />
    </BlockFrame>
  )
}

/** A row of call-to-action buttons (lib/richtext/blocks/buttons), drawn with React */
export class ButtonsNode extends DecoratorNode<ReactNode> {
  $config() {
    return this.config('buttons', {
      extends: DecoratorNode,
      stateConfigs: [
        { flat: true, stateConfig: buttonsState },
        { flat: true, stateConfig: alignState },
      ],
      importDOM: {
        div: (el: HTMLElement) => (el.hasAttribute('data-buttons') ? { conversion: $convertButtons, priority: 1 } : null),
      },
    })
  }

  getData(): ButtonsData {
    return { buttons: $getState(this, buttonsState), align: $getState(this, alignState) }
  }

  setData({ buttons, align }: ButtonsData): this {
    return $setState($setState(this, buttonsState, parseButtons(buttons)), alignState, parseAlign(align))
  }

  createDOM(): HTMLElement {
    return $getDocument().createElement('div')
  }

  updateDOM(): false {
    return false
  }

  exportDOM(): DOMExportOutput {
    const { buttons, align } = this.getData()
    const doc = $getDocument()
    const div = doc.createElement('div')
    div.setAttribute('data-buttons', '')
    if (align === 'center') div.style.textAlign = 'center'
    for (const b of buttons) {
      const a = doc.createElement('a')
      a.href = b.href
      a.textContent = b.label
      a.setAttribute('data-style', b.style)
      div.append(a, ' ')
    }
    return { element: div }
  }

  getTextContent(): string {
    return '\n'
  }

  isInline(): false {
    return false
  }

  decorate(): ReactNode {
    return <ButtonsBlock nodeKey={this.getKey()} data={this.getData()} />
  }
}

function $convertButtons(el: HTMLElement): DOMConversionOutput {
  const buttons = parseButtons([...el.querySelectorAll('a')].map((a) => ({ label: a.textContent ?? '', href: a.getAttribute('href') ?? '', style: a.getAttribute('data-style') })))
  return { node: buttons.length ? $createButtonsNode({ buttons, align: el.style.textAlign === 'center' ? 'center' : 'start' }) : null, forChild: () => null }
}

export function $createButtonsNode(data: ButtonsData): ButtonsNode {
  return $create(ButtonsNode).setData(data)
}

export function $isButtonsNode(node: LexicalNode | null | undefined): node is ButtonsNode {
  return node instanceof ButtonsNode
}
