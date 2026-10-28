'use client'

import { CodeExtension } from '@lexical/code-core'
import { HorizontalRuleExtension } from '@lexical/extension'
import { HistoryExtension } from '@lexical/history'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { LinkExtension } from '@lexical/link'
import { ListExtension } from '@lexical/list'
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { RichTextExtension } from '@lexical/rich-text'
import { TableExtension } from '@lexical/table'
import { $getRoot, $insertNodes, configExtension, defineExtension, type EditorState, type InitialEditorStateType, type LexicalEditor } from 'lexical'
import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FC } from 'react'

import { cn } from '@/lib/cn'
import { safeHref } from '@/lib/safeUrl'

import { useHydrated } from '../../Portal'
import { useFieldControl } from '../Field'
import { DEFAULT_FONTS, DEFAULT_SIZES, richTextTheme } from './theme'
import { RichTextOptionsContext, type UploadStatus } from './context'
import { RichTextContextMenu } from './ContextMenu'
import { BlocksExtension, ImageUploads, migrateFaqJSON } from './nodes'
import { Ribbon } from './Ribbon'
import { TableHandles } from './TableHandles'
import { Toolbar } from './Toolbar'
import type { RichTextEditorProps, RichTextValue } from './types'

export { DEFAULT_FONTS, DEFAULT_SIZES } from './theme'

/**
 * The starting content: Lexical JSON as it is, HTML read into nodes (only in the browser,
 * which can parse it), or anything else as markdown (posts written before this editor).
 */
const startingState = (value: string | undefined): InitialEditorStateType | undefined => {
  if (!value?.trim()) return undefined
  const v = value.trim()
  // FAQs saved as data (before they were typed in place) open as questions and answers
  if (v.startsWith('{')) return migrateFaqJSON(value)
  if (!v.startsWith('<')) return () => $convertFromMarkdownString(value, TRANSFORMERS)
  return (editor: LexicalEditor) => {
    if (typeof DOMParser === 'undefined') return
    const dom = new DOMParser().parseFromString(value, 'text/html')
    const nodes = $generateNodesFromDOM(editor, dom)
    $getRoot().select()
    $insertNodes(nodes)
  }
}

/** Everything the editor can do, as one root extension: each feature brings its own nodes and commands */
const editorExtension = (initial: InitialEditorStateType | undefined, editable: boolean) =>
  defineExtension({
    name: '@cseg/rich-text',
    namespace: 'cseg-rich-text',
    theme: richTextTheme,
    editable,
    $initialEditorState: initial,
    // A broken editor should say so loudly while building, not lose someone's text quietly
    onError: (error) => {
      throw error
    },
    dependencies: [
      RichTextExtension,
      HistoryExtension,
      ListExtension,
      CodeExtension,
      HorizontalRuleExtension,
      // Callouts, images, and button rows
      BlocksExtension,
      // Only links that are safe to follow: http(s), mailto, tel, and paths on this site
      configExtension(LinkExtension, { validateUrl: (url: string) => safeHref(url) !== null, attributes: undefined }),
      // Tab moves on to the next field, as in any other form control
      configExtension(TableExtension, { hasCellMerge: false, hasCellBackgroundColor: false, hasTabHandler: false, hasHorizontalScroll: true }),
    ],
  })

const valueOf = (editorState: EditorState, editor: LexicalEditor): RichTextValue =>
  editorState.read(() => ({ json: JSON.stringify(editorState.toJSON()), html: $generateHtmlFromNodes(editor, null), text: $getRoot().getTextContent() }))

/**
 * Reports the content: once when the editor starts (so a form sent without edits still
 * carries it), then after each change to the text. Moving the cursor isn't a change.
 */
const ValueSync: FC<{ onValue: (value: RichTextValue) => void }> = ({ onValue }) => {
  const [editor] = useLexicalComposerContext()
  const onValueRef = useRef(onValue)
  onValueRef.current = onValue
  useEffect(() => {
    onValueRef.current(valueOf(editor.getEditorState(), editor))
    return editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return
      onValueRef.current(valueOf(editorState, editor))
    })
  }, [editor])
  return null
}

/**
 * A rich text editor, built on Lexical's extensions: blocks (paragraphs, headings, quotes,
 * callouts, lists, code blocks, dividers, images, and rows of buttons), fonts and sizes,
 * bold through highlight and inline code, and tables. With `uploadImage`, images can be
 * uploaded from the Image tool, or pasted or dropped into the text.
 *
 *   <Field label="Announcement">
 *     <RichTextEditor name="body" htmlName="body_html" onChange={({ text }) => setLength(text.length)} />
 *   </Field>
 *
 * Starting content can be Lexical JSON, HTML, or markdown. `onChange` gives the content as Lexical JSON (save this to edit it again), HTML (for
 * showing it; sanitize it first on a public page), and plain text. With `name`, the JSON
 * is sent with the form; with `htmlName`, the HTML too. The usual shortcuts work (⌘/Ctrl
 * B, I, U, Z), and Tab leaves the editor like any other field.
 */
export const RichTextEditor: FC<RichTextEditorProps> = ({
  defaultValue,
  onChange,
  name,
  htmlName,
  placeholder = 'Write something…',
  fonts = DEFAULT_FONTS,
  fontSizes = DEFAULT_SIZES,
  minHeight = '12rem',
  readOnly = false,
  toolbar = 'compact',
  uploadImage,
  id,
  disabled,
  invalid,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  className,
}) => {
  const field = useFieldControl({ id, disabled, invalid, 'aria-describedby': describedBy })
  const off = field.disabled || readOnly
  const [value, setValue] = useState<RichTextValue>({ json: defaultValue?.trim().startsWith('{') ? defaultValue : '', html: '', text: '' })
  // Made once: a new extension would build a new editor (and lose what's typed)
  const [extension] = useState(() => editorExtension(startingState(defaultValue), !off))
  // HTML starting content only loads in the browser, so the server's editor is always empty.
  // The placeholder waits for hydration, or the server would show it over content that's there.
  const hydrated = useHydrated()
  const [upload, setUpload] = useState<UploadStatus>({ state: 'idle' })
  const options = useMemo(() => ({ uploadImage, reportUpload: setUpload }), [uploadImage])
  const placeholderProps = hydrated
    ? { 'aria-placeholder': placeholder, placeholder: <div className="pointer-events-none absolute top-3 left-4 text-ink-faint select-none">{placeholder}</div> }
    : {}

  return (
    // The writing area is placed below, under the toolbar, rather than as the composer's first child
    <RichTextOptionsContext.Provider value={options}>
      <LexicalExtensionComposer extension={extension} contentEditable={null}>
        <div
          className={cn(
            'flex min-w-0 flex-col overflow-hidden rounded-lg border bg-surface transition-colors',
            field.invalid ? 'border-danger' : 'border-line focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/20',
            field.disabled && 'bg-fill opacity-70',
            readOnly && 'border-transparent bg-transparent focus-within:ring-0',
            className
          )}
        >
          {readOnly ? null : toolbar === 'ribbon' ? <Ribbon fonts={fonts} sizes={fontSizes} disabled={off} /> : <Toolbar fonts={fonts} sizes={fontSizes} disabled={off} />}
          <RichTextContextMenu readOnly={off} className="relative">
            <ContentEditable
              id={field.controlProps.id}
              aria-labelledby={field.labelId}
              aria-label={field.labelId ? undefined : (ariaLabel ?? 'Rich text')}
              aria-describedby={field.controlProps['aria-describedby']}
              aria-invalid={field.controlProps['aria-invalid']}
              {...placeholderProps}
              // <mark>'s built-in yellow would cover the theme's softer highlight on the text inside it
              className={cn('px-4 py-3 text-[0.95rem] text-ink outline-none [&_mark]:bg-transparent [&_mark]:text-inherit', readOnly && 'px-0')}
              style={{ minHeight: readOnly ? undefined : minHeight }}
            />
            <TableHandles disabled={off} />
          </RichTextContextMenu>
          {upload.state !== 'idle' ? (
            <div
              role={upload.state === 'failed' ? 'alert' : 'status'}
              className={cn(
                'flex items-center gap-2 border-t border-line px-4 py-1.5 text-[0.8rem] font-semibold',
                upload.state === 'failed' ? 'bg-danger/8 text-danger' : 'bg-fill text-ink-soft'
              )}
            >
              <span className="flex-1">{upload.state === 'failed' ? upload.message : `Uploading ${upload.count === 1 ? 'an image' : `${upload.count} images`}…`}</span>
              {upload.state === 'failed' ? (
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setUpload({ state: 'idle' })}
                  className="grid size-6 cursor-pointer place-items-center rounded-md hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <X size={14} aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <ImageUploads />
        <ValueSync
          onValue={(next) => {
            setValue(next)
            onChange?.(next)
          }}
        />
        {name ? <input type="hidden" name={name} value={value.json} /> : null}
        {htmlName ? <input type="hidden" name={htmlName} value={value.html} /> : null}
      </LexicalExtensionComposer>
    </RichTextOptionsContext.Provider>
  )
}
