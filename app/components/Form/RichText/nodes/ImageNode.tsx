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

import { Figure, parseAlt, parseCaption, parseSrc, type ImageData } from '@/lib/richtext/blocks'

import { BlockFrame } from './BlockFrame'
import { ImageDialog } from './ImageDialog'

/** Saved flat, beside "type": { type: 'image', src, alt, caption } */
const srcState = createState('src', { parse: parseSrc })
const altState = createState('alt', { parse: parseAlt })
const captionState = createState('caption', { parse: parseCaption })

const ImageBlock: FC<{ nodeKey: NodeKey; image: ImageData }> = ({ nodeKey, image }) => {
  const [editor] = useLexicalComposerContext()
  const [editing, setEditing] = useState(false)
  const edit = useCallback(() => setEditing(true), [])
  return (
    <BlockFrame nodeKey={nodeKey} label="Image" onEdit={edit}>
      {image.src ? (
        <Figure {...image} className="my-0" />
      ) : (
        <div className="grid min-h-24 place-items-center rounded-xl border border-dashed border-line bg-fill text-[0.85rem] text-muted">No image yet</div>
      )}
      <ImageDialog
        open={editing}
        initial={image}
        onClose={() => {
          setEditing(false)
          editor.focus()
        }}
        onSave={(next) => {
          setEditing(false)
          editor.update(() => {
            const node = $getNodeByKey(nodeKey)
            if ($isImageNode(node)) node.setImage(next)
          })
          editor.focus()
        }}
      />
    </BlockFrame>
  )
}

/** A picture (lib/richtext/blocks/image), drawn with React; click it to change or remove it */
export class ImageNode extends DecoratorNode<ReactNode> {
  $config() {
    return this.config('image', {
      extends: DecoratorNode,
      stateConfigs: [
        { flat: true, stateConfig: srcState },
        { flat: true, stateConfig: altState },
        { flat: true, stateConfig: captionState },
      ],
      importDOM: {
        // Pasted from another page: a <figure> keeps its caption; a lone <img> is just the picture
        figure: (el: HTMLElement) => (el.querySelector('img') ? { conversion: $convertFigure, priority: 1 } : null),
        img: () => ({ conversion: $convertImg, priority: 0 }),
      },
    })
  }

  getImage(): ImageData {
    return { src: $getState(this, srcState), alt: $getState(this, altState), caption: $getState(this, captionState) }
  }

  setImage({ src, alt, caption }: ImageData): this {
    return $setState($setState($setState(this, srcState, parseSrc(src)), altState, parseAlt(alt)), captionState, parseCaption(caption))
  }

  createDOM(): HTMLElement {
    const div = $getDocument().createElement('div')
    div.className = 'my-5'
    return div
  }

  updateDOM(): false {
    return false
  }

  exportDOM(): DOMExportOutput {
    const { src, alt, caption } = this.getImage()
    const doc = $getDocument()
    const figure = doc.createElement('figure')
    const img = doc.createElement('img')
    img.src = src
    img.alt = alt
    figure.append(img)
    if (caption) {
      const figcaption = doc.createElement('figcaption')
      figcaption.textContent = caption
      figure.append(figcaption)
    }
    return { element: figure }
  }

  getTextContent(): string {
    return `${this.getImage().caption}\n`
  }

  isInline(): false {
    return false
  }

  decorate(): ReactNode {
    return <ImageBlock nodeKey={this.getKey()} image={this.getImage()} />
  }
}

/** An image only when its address is a safe one (a pasted data: or javascript: image is dropped) */
const $fromElement = (img: HTMLImageElement | null, caption = ''): DOMConversionOutput => {
  const src = parseSrc(img?.getAttribute('src') ?? '')
  return { node: src ? $createImageNode({ src, alt: img?.getAttribute('alt') ?? '', caption }) : null }
}

function $convertImg(el: HTMLElement): DOMConversionOutput {
  return $fromElement(el as HTMLImageElement)
}

function $convertFigure(el: HTMLElement): DOMConversionOutput {
  // The picture and caption are taken here, so nothing inside the figure becomes text too
  return { ...$fromElement(el.querySelector('img'), el.querySelector('figcaption')?.textContent ?? ''), forChild: () => null }
}

export function $createImageNode(image: ImageData): ImageNode {
  return $create(ImageNode).setImage(image)
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode
}
