'use client'

import { NodeSelectionExtension } from '@lexical/extension'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { DRAG_DROP_PASTE } from '@lexical/rich-text'
import { $insertNodeToNearestRoot, mergeRegister } from '@lexical/utils'
import {
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  defineExtension,
  type LexicalCommand,
  type LexicalNode,
} from 'lexical'
import { Icon } from 'lucide-react'
import { useEffect, useState, type FC } from 'react'

import { CALLOUT_TONES, type CalloutTone, type ImageData } from '@/lib/richtext/blocks'

import { $replacingEmptyLine } from '../commands'
import { uploadMessage, useRichTextOptions } from '../context'
import { ButtonsDialog, type ButtonsData } from './ButtonsDialog'
import { $createButtonsNode, ButtonsNode } from './ButtonsNode'
import { CalloutNode } from './CalloutNode'
import { ImageDialog } from './ImageDialog'
import { $createImageNode, ImageNode } from './ImageNode'
import type { BlockDialogProps } from './DataBlockNode'
import { DATA_BLOCKS, type DataBlockType } from './dataBlocks'
import { $isFaqItemNode, $newFaq, FaqAnswerNode, FaqItemNode, FaqNode, FaqQuestionNode, registerFaq } from './FaqNodes'

export { $createCalloutNode, $isCalloutNode, CalloutNode } from './CalloutNode'
export { $isButtonsNode, ButtonsNode } from './ButtonsNode'
export { $isImageNode, ImageNode } from './ImageNode'
export { $addFaqItemAfter, $faqAtSelection, $removeFaq, $removeFaqItem, migrateFaqJSON } from './FaqNodes'

/** A callout tone's icon, for the tools that pick one */
export const CalloutIcon: FC<{ tone: CalloutTone }> = ({ tone }) => <Icon iconNode={CALLOUT_TONES[tone].icon} aria-hidden />

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImageData> = createCommand('INSERT_IMAGE_COMMAND')
export const INSERT_BUTTONS_COMMAND: LexicalCommand<ButtonsData> = createCommand('INSERT_BUTTONS_COMMAND')
/** A new FAQ, with the cursor in its first question */
export const INSERT_FAQ_COMMAND: LexicalCommand<void> = createCommand('INSERT_FAQ_COMMAND')
/** Steps, cards, or a video, with its data */
export const INSERT_DATA_BLOCK_COMMAND: LexicalCommand<{ type: DataBlockType; data: Record<string, unknown> }> = createCommand('INSERT_DATA_BLOCK_COMMAND')

/** A block at the cursor, splitting the paragraph it's in, as a divider goes in */
const $insertBlock = (block: LexicalNode) => $replacingEmptyLine(() => $insertNodeToNearestRoot(block))

/**
 * The site's own blocks: callouts, images, button rows, FAQs, steps, cards, and videos.
 * All but callouts go in as blocks of their own at the cursor.
 */
export const BlocksExtension = defineExtension({
  name: '@cseg/rich-text/blocks',
  dependencies: [NodeSelectionExtension],
  nodes: () => [
    CalloutNode,
    ImageNode,
    ButtonsNode,
    FaqNode,
    FaqItemNode,
    FaqQuestionNode,
    FaqAnswerNode,
    ...Object.values(DATA_BLOCKS).map((b) => b.Node),
  ],
  register: (editor) =>
    mergeRegister(
      registerFaq(editor),
      editor.registerCommand(
        INSERT_FAQ_COMMAND,
        () => {
          const faq = $newFaq()
          $insertBlock(faq)
          const first = faq.getFirstChild()
          if ($isFaqItemNode(first)) first.getQuestion()?.selectStart()
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand(
        INSERT_IMAGE_COMMAND,
        (image) => {
          $insertBlock($createImageNode(image))
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand(
        INSERT_BUTTONS_COMMAND,
        (data) => {
          $insertBlock($createButtonsNode(data))
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand(
        INSERT_DATA_BLOCK_COMMAND,
        ({ type, data }) => {
          $insertBlock(DATA_BLOCKS[type].$create(data as never))
          return true
        },
        COMMAND_PRIORITY_EDITOR
      )
    ),
})

/**
 * Images pasted or dropped into the text are uploaded (when the page gave the editor a way
 * to) and go in where they landed. How it's going shows under the writing area.
 */
export const ImageUploads: FC = () => {
  const [editor] = useLexicalComposerContext()
  const { uploadImage, reportUpload } = useRichTextOptions()
  useEffect(() => {
    if (!uploadImage) return
    return editor.registerCommand(
      DRAG_DROP_PASTE,
      (files) => {
        const images = files.filter((f) => f.type.startsWith('image/'))
        if (!images.length) return false
        reportUpload({ state: 'uploading', count: images.length })
        ;(async () => {
          try {
            for (const file of images) {
              const src = await uploadImage(file)
              editor.update(() => {
                $insertBlock($createImageNode({ src, alt: '', caption: '' }))
              })
            }
            reportUpload({ state: 'idle' })
          } catch (e) {
            reportUpload({ state: 'failed', message: uploadMessage(e) })
          }
        })()
        return true
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, uploadImage, reportUpload])
  return null
}

/** The blocks the Insert tools put in through a dialog (an FAQ goes straight in, with insertFaq) */
export type InsertableBlock = 'image' | 'buttons' | DataBlockType

/**
 * The insert tools' dialogs (image, buttons, steps, cards, video), for the toolbar
 * and the ribbon: call open with the block, and put `dialogs` anywhere in what's drawn
 * (they open at the end of the page).
 */
export function useBlockDialogs() {
  const [editor] = useLexicalComposerContext()
  const [open, setOpen] = useState<InsertableBlock | null>(null)
  const close = () => {
    setOpen(null)
    editor.focus()
  }
  const dialogs = (
    <>
      <ImageDialog
        open={open === 'image'}
        onClose={close}
        onSave={(image) => {
          setOpen(null)
          editor.dispatchCommand(INSERT_IMAGE_COMMAND, image)
          editor.focus()
        }}
      />
      <ButtonsDialog
        open={open === 'buttons'}
        onClose={close}
        onSave={(data) => {
          setOpen(null)
          editor.dispatchCommand(INSERT_BUTTONS_COMMAND, data)
          editor.focus()
        }}
      />
      {(Object.keys(DATA_BLOCKS) as DataBlockType[]).map((type) => {
        const { Dialog } = DATA_BLOCKS[type].spec as unknown as { Dialog: FC<BlockDialogProps<Record<string, unknown>>> }
        return (
          <Dialog
            key={type}
            open={open === type}
            onClose={close}
            onSave={(data) => {
              setOpen(null)
              editor.dispatchCommand(INSERT_DATA_BLOCK_COMMAND, { type, data })
              editor.focus()
            }}
          />
        )
      })}
    </>
  )
  const insertFaq = () => {
    editor.dispatchCommand(INSERT_FAQ_COMMAND, undefined)
    editor.focus()
  }
  return { open: setOpen, openImage: () => setOpen('image'), openButtons: () => setOpen('buttons'), insertFaq, dialogs }
}
