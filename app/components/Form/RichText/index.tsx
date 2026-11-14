'use client'

import { CodeExtension } from '@lexical/code-core'
import { HorizontalRuleExtension } from '@lexical/extension'
import { HistoryExtension } from '@lexical/history'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { AutoLinkExtension, autoLinkEmailMatcher, autoLinkUrlMatcher, LinkExtension } from '@lexical/link'
import { CheckListExtension, ListExtension } from '@lexical/list'
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { RichTextExtension } from '@lexical/rich-text'
import { TableExtension } from '@lexical/table'
import { $getRoot, $insertNodes, $parseSerializedNode, COMMAND_PRIORITY_LOW, configExtension, KEY_DOWN_COMMAND, KEY_ESCAPE_COMMAND, defineExtension, type EditorState, type InitialEditorStateType, type LexicalEditor, type SerializedLexicalNode } from 'lexical'
import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react'

import { cn } from '@/lib/cn'
import { parsePortableText, portableTextRoot, toPortableText, type LexicalJSON } from '@/lib/richtext/portableText'
import { safeHref } from '@/lib/safeUrl'

import { useHydrated } from '../../Portal'
import { useFieldControl } from '../Field'
import { BlockGutter } from './BlockGutter'
import { DEFAULT_FONTS, DEFAULT_SIZES, richTextTheme } from './theme'
import { RichTextOptionsContext, type UploadStatus } from './context'
import { RichTextContextMenu } from './ContextMenu'
import { CommentsPanel, $markSelectionForComment, $unmarkComment, newThreadId } from './comments'
import { EditingExtension } from './editing'
import { FindReplace } from './FindReplace'
import { LineHeightExtension } from './lineHeight'
import { ShortcutsDialog } from './Shortcuts'
import { EditorUIContext } from './ui'
import { BlockDialogs, BlocksExtension, ImageUploads, migrateFaqJSON } from './nodes'
import { Ribbon } from './Ribbon'
import { SlashMenu } from './SlashMenu'
import { TableHandles } from './TableHandles'
import { Toolbar } from './Toolbar'
import type { RichTextEditorProps, RichTextValue } from './types'

export { DEFAULT_FONTS, DEFAULT_SIZES } from './theme'

/**
 * The starting content: Lexical JSON as it is, Portable Text turned into nodes, HTML read
 * into nodes (only in the browser, which can parse it), or anything else as markdown (posts
 * written before this editor).
 */
const startingState = (value: string | undefined): InitialEditorStateType | undefined => {
  if (!value?.trim()) return undefined
  const v = value.trim()
  // FAQs saved as data (before they were typed in place) open as questions and answers
  if (v.startsWith('{')) return migrateFaqJSON(value)
  const portable = parsePortableText(v)
  if (portable)
    return (editor: LexicalEditor) => {
      const { children = [] } = portableTextRoot(portable, (type) => editor._nodes.has(type))
      $getRoot().append(...children.map((n) => $parseSerializedNode(n as unknown as SerializedLexicalNode)))
    }
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
      // Ticking a box leaves the cursor where it was, in the middle of writing
      configExtension(CheckListExtension, { disableTakeFocusOnClick: true }),
      CodeExtension,
      HorizontalRuleExtension,
      // Callouts, images, and button rows
      BlocksExtension,
      // Markdown as it's typed, and the keyboard's block tools
      EditingExtension,
      // A block's line spacing, drawn as it'll show
      LineHeightExtension,
      // Only links that are safe to follow: http(s), mailto, tel, and paths on this site
      configExtension(LinkExtension, { validateUrl: (url: string) => safeHref(url) !== null, attributes: undefined }),
      // A typed or pasted web address or email turns into a link on its own (not in a code block, which is plain text)
      configExtension(AutoLinkExtension, { matchers: [autoLinkUrlMatcher, autoLinkEmailMatcher], excludeParents: [(parent) => parent.getType() === 'code'] }),
      // Tab moves on to the next field, as in any other form control
      configExtension(TableExtension, { hasCellMerge: true, hasCellBackgroundColor: true, hasTabHandler: false, hasHorizontalScroll: true }),
    ],
  })

const valueOf = (editorState: EditorState, editor: LexicalEditor): RichTextValue =>
  editorState.read(() => {
    const state = editorState.toJSON()
    return {
      json: JSON.stringify(state),
      html: $generateHtmlFromNodes(editor, null),
      text: $getRoot().getTextContent(),
      portableText: JSON.stringify(toPortableText(state.root as unknown as LexicalJSON)),
    }
  })

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

/** Hands the editor to the component around the composer, for what it does outside it (marking a comment) */
const EditorRef: FC<{ into: { current: LexicalEditor | null } }> = ({ into }) => {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    into.current = editor
    return () => {
      into.current = null
    }
  }, [editor, into])
  return null
}

/** ⌘/Ctrl+F finds, ⌘/Ctrl+/ shows the shortcuts, and Escape leaves full screen, while the writing has focus */
const EditorKeys: FC<{ onFind: () => void; onShortcuts: () => void; fullscreen: boolean; onLeaveFullscreen: () => void }> = ({ onFind, onShortcuts, fullscreen, onLeaveFullscreen }) => {
  const [editor] = useLexicalComposerContext()
  useEffect(
    () =>
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event) => {
          if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return false
          if (event.key === 'f' || event.key === 'F') onFind()
          else if (event.key === '/') onShortcuts()
          else return false
          event.preventDefault()
          return true
        },
        COMMAND_PRIORITY_LOW
      ),
    [editor, onFind, onShortcuts]
  )
  useEffect(() => {
    if (!fullscreen) return
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        onLeaveFullscreen()
        return true
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor, fullscreen, onLeaveFullscreen])
  return null
}

/**
 * A block editor, built on Lexical's extensions and modeled on Portable Text: a document
 * is a list of blocks (paragraphs, headings, quotes, callouts, lists and checklists, code
 * blocks, dividers, images, rows of buttons, tables, and the site's own), each moved whole
 * by its grip or with Alt+↑/↓, over text with fonts, sizes, and marks. "/" opens every
 * block, and markdown ("# ", "- ", "---") works as it's typed. Between the words of a line
 * can go chips, dates, badges, footnotes, buttons, and images. With `uploadImage`, images
 * can be uploaded from the Image tool, or pasted or dropped into the text.
 *
 *   <Field label="Announcement">
 *     <RichTextEditor name="body" htmlName="body_html" onChange={({ text }) => setLength(text.length)} />
 *   </Field>
 *
 * Starting content can be Lexical JSON, Portable Text, HTML, or markdown. `onChange` gives
 * the content as Lexical JSON (save this to edit it again), HTML (for showing it; sanitize
 * it first on a public page), plain text, and Portable Text. With `name`, the JSON is sent
 * with the form; with `htmlName` and `portableTextName`, those too. The usual shortcuts
 * work (⌘/Ctrl B, I, U, Z), and Tab leaves the editor like any other field.
 */
export const RichTextEditor: FC<RichTextEditorProps> = ({
  defaultValue,
  onChange,
  name,
  htmlName,
  portableTextName,
  placeholder = 'Write something…',
  fonts = DEFAULT_FONTS,
  fontSizes = DEFAULT_SIZES,
  minHeight = '12rem',
  readOnly = false,
  toolbar = 'compact',
  uploadImage,
  imagePicker,
  uploadFile,
  fileAccept,
  comments,
  id,
  disabled,
  invalid,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  className,
}) => {
  const field = useFieldControl({ id, disabled, invalid, 'aria-describedby': describedBy })
  const off = field.disabled || readOnly
  const [value, setValue] = useState<RichTextValue>({ json: defaultValue?.trim().startsWith('{') ? defaultValue : '', html: '', text: '', portableText: '' })
  // Where the block gutter is placed, once it's on the page
  const [writingArea, setWritingArea] = useState<HTMLDivElement | null>(null)
  // Made once: a new extension would build a new editor (and lose what's typed)
  const [extension] = useState(() => editorExtension(startingState(defaultValue), !off))
  // HTML starting content only loads in the browser, so the server's editor is always empty.
  // The placeholder waits for hydration, or the server would show it over content that's there.
  const hydrated = useHydrated()
  const [upload, setUpload] = useState<UploadStatus>({ state: 'idle' })
  const options = useMemo(() => ({ uploadImage, imagePicker, uploadFile, fileAccept, reportUpload: setUpload }), [uploadImage, imagePicker, uploadFile, fileAccept])
  // The editor's own views: over the whole window, the find bar, and the shortcuts
  const [fullscreen, setFullscreen] = useState(false)
  const [finding, setFinding] = useState(false)
  const [showingShortcuts, setShowingShortcuts] = useState(false)
  const openFind = useCallback(() => setFinding(true), [])
  const openShortcuts = useCallback(() => setShowingShortcuts(true), [])
  const leaveFullscreen = useCallback(() => setFullscreen(false), [])
  // A comment being started: its words are marked at once, so they stay marked while it's written
  const [pendingComment, setPendingComment] = useState<{ threadId: string; quote: string } | null>(null)
  const editorRef = useRef<LexicalEditor | null>(null)
  const startComment = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const threadId = newThreadId()
    editor.update(() => {
      const quote = $markSelectionForComment(threadId)
      if (quote) setPendingComment({ threadId, quote })
    })
  }, [])
  const ui = useMemo(
    () => ({ fullscreen, toggleFullscreen: () => setFullscreen((f) => !f), openFind, openShortcuts, commenting: !!comments, startComment }),
    [fullscreen, openFind, openShortcuts, comments, startComment]
  )
  // The page behind doesn't scroll while the editor fills the window
  useEffect(() => {
    if (!fullscreen) return
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = before
    }
  }, [fullscreen])
  const placeholderProps = hydrated
    ? { 'aria-placeholder': placeholder, placeholder: <div className={cn('pointer-events-none absolute top-3 left-4 text-ink-faint select-none', !off && 'pointer-fine:left-12')}>{placeholder}</div> }
    : {}

  return (
    // The writing area is placed below, under the toolbar, rather than as the composer's first child
    <RichTextOptionsContext.Provider value={options}>
      <EditorUIContext.Provider value={ui}>
      <LexicalExtensionComposer extension={extension} contentEditable={null}>
        <BlockDialogs>
          <div
            className={cn(
              'flex min-w-0 flex-col overflow-hidden rounded-lg border bg-surface transition-colors',
              field.invalid ? 'border-danger' : 'border-line focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/20',
              field.disabled && 'bg-fill opacity-70',
              readOnly && 'border-transparent bg-transparent focus-within:ring-0',
              className,
              // Over the whole window, under the menus and dialogs it opens
              fullscreen && 'fixed inset-0 z-38 rounded-none border-0 ring-0 focus-within:ring-0'
            )}
          >
            {readOnly ? null : toolbar === 'ribbon' ? <Ribbon fonts={fonts} sizes={fontSizes} disabled={off} /> : <Toolbar fonts={fonts} sizes={fontSizes} disabled={off} />}
            {finding && !readOnly ? <FindReplace onClose={() => setFinding(false)} /> : null}
            <RichTextContextMenu readOnly={off} className={cn('relative', fullscreen && 'min-h-0 flex-1 overflow-y-auto')}>
              <div ref={setWritingArea} className="relative">
                <ContentEditable
                  id={field.controlProps.id}
                  aria-labelledby={field.labelId}
                  aria-label={field.labelId ? undefined : (ariaLabel ?? 'Rich text')}
                  aria-describedby={field.controlProps['aria-describedby']}
                  aria-invalid={field.controlProps['aria-invalid']}
                  {...placeholderProps}
                  // <mark>'s built-in yellow would cover the theme's softer highlight on the text inside it.
                  // The left padding is the block gutter's, which needs a pointer to reach.
                  className={cn(
                    'px-4 py-3 text-[0.95rem] text-ink outline-none [counter-reset:rich-footnote] [&_mark]:bg-transparent [&_mark]:text-inherit',
                    !off && 'pointer-fine:pl-12',
                    readOnly && 'px-0',
                    // A reading column in the middle of the window
                    fullscreen && 'mx-auto w-full max-w-3xl pt-8 pb-24'
                  )}
                  style={{ minHeight: readOnly ? undefined : fullscreen ? '100%' : minHeight }}
                />
                <TableHandles disabled={off} />
                {writingArea && !off ? <BlockGutter anchor={writingArea} /> : null}
              </div>
            </RichTextContextMenu>
            {upload.state !== 'idle' ? (
              <div
                role={upload.state === 'failed' ? 'alert' : 'status'}
                className={cn(
                  'flex items-center gap-2 border-t border-line px-4 py-1.5 text-[0.8rem] font-semibold',
                  upload.state === 'failed' ? 'bg-danger/8 text-danger' : 'bg-fill text-ink-soft'
                )}
              >
                <span className="flex-1">{upload.state === 'failed' ? upload.message : `Uploading ${upload.count === 1 ? `a${upload.what === 'file' ? ' file' : 'n image'}` : `${upload.count} ${upload.what === 'file' ? 'files' : 'images'}`}…`}</span>
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
            {comments && !readOnly ? (
              <CommentsPanel
                adapter={comments}
                pending={pendingComment}
                onPendingDone={(posted) => {
                  // Not posted: the words go back to how they were
                  if (!posted && pendingComment) editorRef.current?.update(() => $unmarkComment(pendingComment.threadId))
                  setPendingComment(null)
                }}
              />
            ) : null}
          </div>
          {off ? null : <SlashMenu />}

        </BlockDialogs>
        <ImageUploads />
        <EditorRef into={editorRef} />
        {off ? null : <EditorKeys onFind={openFind} onShortcuts={openShortcuts} fullscreen={fullscreen} onLeaveFullscreen={leaveFullscreen} />}
        <ShortcutsDialog open={showingShortcuts} onClose={() => setShowingShortcuts(false)} />
        <ValueSync
          onValue={(next) => {
            setValue(next)
            onChange?.(next)
          }}
        />
        {name ? <input type="hidden" name={name} value={value.json} /> : null}
        {htmlName ? <input type="hidden" name={htmlName} value={value.html} /> : null}
        {portableTextName ? <input type="hidden" name={portableTextName} value={value.portableText} /> : null}
      </LexicalExtensionComposer>
      </EditorUIContext.Provider>
    </RichTextOptionsContext.Provider>
  )
}
