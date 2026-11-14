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
import { useCallback, useRef, useState, type FC, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'

import { Figure, IMAGE_WIDTH, parseAlt, parseCaption, parseImageAlign, parseImageHref, parseImageSize, parseImageWidth, parseSrc, type ImageData } from '@/lib/richtext/blocks'

import { BlockFrame } from './BlockFrame'
import { ImageDialog } from './ImageDialog'

/** Saved flat, beside "type": { type: 'image', src, alt, caption }, and its size, side, and link when they aren't the usual */
const srcState = createState('src', { parse: parseSrc })
const altState = createState('alt', { parse: parseAlt })
const captionState = createState('caption', { parse: parseCaption })
const sizeState = createState('size', { parse: parseImageSize })
const alignState = createState('align', { parse: parseImageAlign })
const hrefState = createState('href', { parse: parseImageHref })
const widthState = createState('width', { parse: parseImageWidth })

/** The width an image shows at now, in percent of the column: its own, or its size's */
const shownWidth = (image: ImageData) => image.width || ({ full: 100, large: 75, medium: 50, small: 33 } as const)[image.size ?? 'full']

const ImageBlock: FC<{ nodeKey: NodeKey; image: ImageData }> = ({ nodeKey, image }) => {
  const [editor] = useLexicalComposerContext()
  const [editing, setEditing] = useState(false)
  const edit = useCallback(() => setEditing(true), [])
  const [selected] = useLexicalNodeSelection(nodeKey)
  // While a drag is on, the width it's at; saved when it's let go
  const [dragged, setDragged] = useState<number | null>(null)
  const drag = useRef<{ x: number; start: number; column: number; side: 1 | -1 } | null>(null)
  const shown = dragged ?? (image.width || 0)

  const save = (width: number) =>
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isImageNode(node)) node.setImage({ ...node.getImage(), width: parseImageWidth(width) })
    })

  const onPointerDown = (e: PointerEvent<HTMLSpanElement>) => {
    const figure = e.currentTarget.closest('figure')
    const column = editor.getRootElement()?.clientWidth ?? 0
    if (!figure || !column) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    // A right-hand image is widened from its left edge
    drag.current = { x: e.clientX, start: figure.getBoundingClientRect().width, column, side: image.align === 'right' ? -1 : 1 }
  }
  const onPointerMove = (e: PointerEvent<HTMLSpanElement>) => {
    const d = drag.current
    if (!d) return
    setDragged(parseImageWidth(((d.start + (e.clientX - d.x) * d.side) / d.column) * 100))
  }
  const onPointerUp = () => {
    if (drag.current && dragged !== null) save(dragged)
    drag.current = null
    setDragged(null)
  }
  // From the keyboard: the arrows make it narrower or wider, a step at a time
  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    const by = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
    if (!by) return
    e.preventDefault()
    e.stopPropagation()
    save(shownWidth(image) + by * IMAGE_WIDTH.step)
  }
  return (
    <BlockFrame nodeKey={nodeKey} label="Image" onEdit={edit}>
      {image.src ? (
        <Figure
          {...image}
          width={shown}
          className="my-0"
          preview
          overlay={
            selected ? (
              <>
                <span
                  role="slider"
                  tabIndex={0}
                  aria-label="Image width"
                  aria-valuemin={IMAGE_WIDTH.min}
                  aria-valuemax={IMAGE_WIDTH.max}
                  aria-valuenow={dragged ?? shownWidth(image)}
                  aria-valuetext={`${dragged ?? shownWidth(image)}% of the column`}
                  title="Drag to resize"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onKeyDown={onKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute top-1/2 z-10 h-12 w-2.5 -translate-y-1/2 cursor-ew-resize touch-none rounded-full border-2 border-surface bg-brand shadow-[0_2px_6px_rgb(0_0_0/0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                    image.align === 'right' ? '-left-1.5' : '-right-1.5'
                  }`}
                />
                {dragged !== null ? (
                  <span aria-hidden className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-md bg-ink px-2 py-0.5 text-[0.75rem] font-semibold text-surface tabular-nums">
                    {dragged}%
                  </span>
                ) : null}
              </>
            ) : null
          }
        />
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
        { flat: true, stateConfig: sizeState },
        { flat: true, stateConfig: alignState },
        { flat: true, stateConfig: hrefState },
        { flat: true, stateConfig: widthState },
      ],
      importDOM: {
        // Pasted from another page: a <figure> keeps its caption; a lone <img> is just the picture
        figure: (el: HTMLElement) => (el.querySelector('img') ? { conversion: $convertFigure, priority: 1 } : null),
        img: () => ({ conversion: $convertImg, priority: 0 }),
      },
    })
  }

  getImage(): ImageData {
    return {
      src: $getState(this, srcState),
      alt: $getState(this, altState),
      caption: $getState(this, captionState),
      size: $getState(this, sizeState),
      align: $getState(this, alignState),
      href: $getState(this, hrefState),
      width: $getState(this, widthState),
    }
  }

  setImage({ src, alt, caption, size, align, href, width }: ImageData): this {
    let node = $setState($setState($setState(this, srcState, parseSrc(src)), altState, parseAlt(alt)), captionState, parseCaption(caption))
    node = $setState($setState(node, sizeState, parseImageSize(size)), alignState, parseImageAlign(align))
    return $setState($setState(node, hrefState, parseImageHref(href)), widthState, parseImageWidth(width))
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
    const { src, alt, caption, href } = this.getImage()
    const doc = $getDocument()
    const figure = doc.createElement('figure')
    const img = doc.createElement('img')
    img.src = src
    img.alt = alt
    if (href) {
      const a = doc.createElement('a')
      a.href = href
      a.append(img)
      figure.append(a)
    } else figure.append(img)
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
