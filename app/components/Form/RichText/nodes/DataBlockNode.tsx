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
  type StateConfig,
} from 'lexical'
import { useCallback, useState, type FC, type ReactNode } from 'react'

import { BlockFrame } from './BlockFrame'

export interface BlockDialogProps<T> {
  open: boolean
  /** The block's data, when editing one that's there */
  initial?: T
  onClose: () => void
  onSave: (data: T) => void
}

/** A block whose content is data set in a dialog (an FAQ, steps, cards, a video) */
export interface DataBlockSpec<T extends Record<string, unknown>> {
  /** The node's type, as saved */
  type: string
  /** Its name in the editor: "FAQ", "Steps" */
  label: string
  /** It sits in a line of text, between words, rather than being a block of its own */
  inline?: boolean
  /** Each saved field, and how a saved value is read (and cleaned) */
  fields: { [K in keyof T]: (value: unknown) => T[K] }
  /** Whether there's anything to show */
  has: (data: T) => boolean
  /** How it looks in the editor (lib/richtext/blocks, in its preview form) */
  View: FC<{ data: T }>
  Dialog: FC<BlockDialogProps<T>>
  /** Readable HTML for the export; the data goes alongside, so it reads back in */
  toDOM: (data: T, doc: Document) => HTMLElement
  /** Its words, for the plain text. A block's are a line of their own; an inline item's run on in the sentence. */
  text: (data: T) => string
}

function DataBlockView<T extends Record<string, unknown>>({ spec, nodeKey, data, setData }: { spec: DataBlockSpec<T>; nodeKey: NodeKey; data: T; setData: (node: LexicalNode, data: T) => void }) {
  const [editor] = useLexicalComposerContext()
  const [editing, setEditing] = useState(false)
  const edit = useCallback(() => setEditing(true), [])
  const { View, Dialog } = spec
  return (
    <BlockFrame nodeKey={nodeKey} label={spec.label} onEdit={edit} inline={spec.inline}>
      {spec.inline ? (
        spec.has(data) ? <View data={data} /> : <span className="rounded border border-dashed border-line px-1 text-muted">Empty {spec.label}</span>
      ) : (
        <div className="py-px">{spec.has(data) ? <View data={data} /> : <div className="my-4 rounded-lg border border-dashed border-line px-4 py-3 text-[0.85rem] text-muted">Empty {spec.label}</div>}</div>
      )}
      <Dialog
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
            if (node) setData(node, next)
          })
          editor.focus()
        }}
      />
    </BlockFrame>
  )
}

/**
 * Makes the Lexical node for a data block: its fields saved flat beside "type" (as
 * { type: 'faq', items: [...] }), drawn with React in a BlockFrame (click to select, Edit
 * opens its dialog), exported as readable HTML with the data in data-props, and read back
 * from that HTML when pasted. With `inline`, all of that in a line of text, in spans.
 */
export function defineDataBlock<T extends Record<string, unknown>>(spec: DataBlockSpec<T>) {
  const keys = Object.keys(spec.fields) as (keyof T & string)[]
  const tag = spec.inline ? 'span' : 'div'
  const states = Object.fromEntries(keys.map((k) => [k, createState(k, { parse: spec.fields[k] })])) as unknown as Record<keyof T & string, StateConfig<string, unknown>>

  /** Any value as this block's data, each field read as saved values are */
  const parse = (raw: unknown): T => Object.fromEntries(keys.map((k) => [k, spec.fields[k]((raw as Record<string, unknown> | null)?.[k])])) as T

  class DataBlockNode extends DecoratorNode<ReactNode> {
    $config() {
      return this.config(spec.type, {
        extends: DecoratorNode,
        stateConfigs: keys.map((k) => ({ flat: true, stateConfig: states[k] })),
        importDOM: {
          [tag]: (el: HTMLElement) => (el.getAttribute('data-block') === spec.type ? { conversion: $convert, priority: 2 as const } : null),
        },
      })
    }

    getData(): T {
      return Object.fromEntries(keys.map((k) => [k, $getState(this, states[k])])) as T
    }

    setData(data: T): this {
      const clean = parse(data)
      let node = this.getWritable()
      for (const k of keys) node = $setState(node, states[k], clean[k])
      return node
    }

    createDOM(): HTMLElement {
      return $getDocument().createElement(tag)
    }

    updateDOM(): false {
      return false
    }

    exportDOM(): DOMExportOutput {
      const data = this.getData()
      const doc = $getDocument()
      const element = doc.createElement(tag)
      element.setAttribute('data-block', spec.type)
      element.setAttribute('data-props', JSON.stringify(data))
      element.append(spec.toDOM(data, doc))
      return { element }
    }

    getTextContent(): string {
      return spec.inline ? spec.text(this.getData()) : `${spec.text(this.getData())}\n`
    }

    isInline(): boolean {
      return !!spec.inline
    }

    decorate(): ReactNode {
      return <DataBlockView spec={spec} nodeKey={this.getKey()} data={this.getData()} setData={(node, data) => is(node) && node.setData(data)} />
    }
  }

  const is = (node: LexicalNode | null | undefined): node is DataBlockNode => node instanceof DataBlockNode
  const $createNode = (data: T) => $create(DataBlockNode).setData(data)

  function $convert(el: HTMLElement): DOMConversionOutput {
    let raw: unknown = null
    try {
      raw = JSON.parse(el.getAttribute('data-props') ?? 'null')
    } catch {
      // Not ours after all: nothing comes in
    }
    const data = parse(raw)
    // The readable copy inside is skipped, or its words would come in a second time
    return { node: spec.has(data) ? $createNode(data) : null, forChild: () => null }
  }

  return { spec, Node: DataBlockNode, $create: $createNode, $is: is, parse }
}

export type DataBlock = ReturnType<typeof defineDataBlock<Record<string, unknown>>>
