'use client'

import { $createCodeNode, $isCodeNode } from '@lexical/code-core'
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode } from '@lexical/rich-text'
import { $getSelectionStyleValueForProperty, $patchStyleText, $setBlocksType } from '@lexical/selection'
import { $getTableCellNodeFromLexicalNode, INSERT_TABLE_COMMAND } from '@lexical/table'
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from '@lexical/utils'
import {
  $createParagraphNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  type TextFormatType,
} from 'lexical'
import {
  Bold,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  SquareCode,
  Strikethrough,
  Table,
  Underline,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
  type FC,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'

import { cn } from '@/lib/cn'
import type { CalloutTone } from '@/lib/richtext/blocks'
import { linkFromInput } from '@/lib/safeUrl'

import { Button } from '../../Button'
import { Popover } from '../../Popover'
import { Tooltip } from '../../Tooltip'
import { NumberInput } from '../Number'
import { Switch } from '../Switch'
import { $hasHeaderRow, $replacingEmptyLine } from './commands'
import { $addFaqItemAfter, $createCalloutNode, $faqAtSelection, $isCalloutNode, $removeFaq, $removeFaqItem } from './nodes'
import type { BlockType, FontOption } from './types'

export const BLOCKS: { type: BlockType; label: string; icon: ReactNode }[] = [
  { type: 'paragraph', label: 'Paragraph', icon: <Pilcrow /> },
  { type: 'h1', label: 'Heading 1', icon: <Heading1 /> },
  { type: 'h2', label: 'Heading 2', icon: <Heading2 /> },
  { type: 'h3', label: 'Heading 3', icon: <Heading3 /> },
  { type: 'quote', label: 'Quote', icon: <Quote /> },
  { type: 'callout', label: 'Callout', icon: <Info /> },
  { type: 'bullet', label: 'Bulleted list', icon: <List /> },
  { type: 'number', label: 'Numbered list', icon: <ListOrdered /> },
  { type: 'code', label: 'Code block', icon: <SquareCode /> },
]

export const FORMATS: { format: TextFormatType; label: string; keys?: string; icon: ReactNode }[] = [
  { format: 'bold', label: 'Bold', keys: 'B', icon: <Bold /> },
  { format: 'italic', label: 'Italic', keys: 'I', icon: <Italic /> },
  { format: 'underline', label: 'Underline', keys: 'U', icon: <Underline /> },
  { format: 'strikethrough', label: 'Strikethrough', icon: <Strikethrough /> },
  { format: 'highlight', label: 'Highlight', icon: <Highlighter /> },
  { format: 'code', label: 'Inline code', icon: <Code /> },
]

export interface ToolbarState {
  block: BlockType
  font: string
  size: string
  formats: Set<TextFormatType>
  /** The selection's colors ("" for none or mixed) */
  color: string
  background: string
  underlineColor: string
  borderColor: string
  inTable: boolean
  /** Whether that table's first row is headers */
  headerRow: boolean
  inCode: boolean
  /** The callout the cursor's in, by its tone (null for none) */
  callout: CalloutTone | null
  /** Whether the cursor's in an FAQ's question or answer (null for neither) */
  faq: 'question' | 'answer' | null
  /** The link the cursor's in ("" for none) */
  link: string
}

const EMPTY: ToolbarState = { block: 'paragraph', font: '', size: '', formats: new Set(), color: '', background: '', underlineColor: '', borderColor: '', inTable: false, headerRow: false, inCode: false, callout: null, faq: null, link: '' }

export const isApple = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** A square toolbar button; mousedown doesn't take focus, so the selection stays put */
export const ToolButton: FC<{ label: string; pressed?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }> = ({ label, pressed, disabled, onClick, children }) => (
  <Tooltip content={label} role="label" delay={500}>
    <button
      type="button"
      data-tool
      aria-pressed={pressed}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors [&>svg]:size-4',
        'hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
        'disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-brand-tint aria-pressed:text-brand'
      )}
    >
      {children}
    </button>
  </Tooltip>
)

/** A dropdown's button in the toolbar; the menu around it adds its own handlers and ARIA, passed through */
export const MenuButton: FC<{ label: string; display: ReactNode } & Omit<ComponentProps<'button'>, 'value'>> = ({ label, display, className, disabled, ...rest }) => (
  <button
    {...rest}
    type="button"
    data-tool
    aria-label={label}
    disabled={disabled}
    className={cn(
      'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[0.82rem] font-semibold text-ink-soft transition-colors [&>svg]:size-4 [&>svg]:shrink-0',
      'hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40',
      className
    )}
  >
    {display}
    <ChevronDown size={14} aria-hidden className="text-ink-faint" />
  </button>
)

export const Divider: FC = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />

/** Picks a table's size before inserting it */
/**
 * Adds, changes, or takes off the link on the selected words. Only safe addresses take
 * (http(s), mailto, tel, or a path here); a bare "gsu.edu" gets https:// in front.
 */
export const LinkTool: FC<{ current: string; disabled?: boolean; onLink: (url: string | null) => void; labeled?: boolean }> = ({ current, disabled, onLink, labeled = false }) => {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(current)
  const [bad, setBad] = useState(false)
  const apply = () => {
    const href = linkFromInput(url)
    if (!href) return setBad(true)
    setOpen(false)
    onLink(href)
  }
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setUrl(current)
          setBad(false)
        }
      }}
      title={current ? 'Edit link' : 'Add a link'}
      trigger={
        <button
          type="button"
          data-tool
          aria-label={current ? `Link: ${current}` : 'Link'}
          aria-pressed={!!current}
          disabled={disabled}
          className={cn(
            'shrink-0 cursor-pointer rounded-md text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-brand-tint aria-pressed:text-brand [&>svg]:size-4',
            labeled ? 'flex h-8 items-center gap-2 pr-2.5 pl-2 text-[0.8rem] font-semibold' : 'grid size-8 place-items-center'
          )}
        >
          <Link2 />
          {labeled ? <span aria-hidden>Link</span> : null}
        </button>
      }
    >
      <form
        className="flex w-64 flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <label className="flex flex-col gap-1 text-[0.8rem] font-semibold text-ink">
          Address
          <input
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setBad(false)
            }}
            placeholder="https://… or /events"
            aria-invalid={bad || undefined}
            className={cn('h-9 rounded-lg border bg-surface px-2.5 text-[0.88rem] font-normal text-ink outline-none focus:border-brand focus:ring-3 focus:ring-brand/20', bad ? 'border-danger' : 'border-line')}
          />
        </label>
        {bad ? (
          <p role="alert" className="m-0 text-[0.78rem] font-semibold text-danger">
            Use a web address (https://…), an email (mailto:…), or a page here (/events).
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          {current ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false)
                onLink(null)
              }}
            >
              Remove link
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" type="submit">
            {current ? 'Update' : 'Add link'}
          </Button>
        </div>
      </form>
    </Popover>
  )
}

/** The ribbon's big buttons: an icon over its label */
export const bigTool = 'flex h-[3.75rem] min-w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-2 text-[0.72rem] font-semibold text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-brand-tint aria-pressed:text-brand [&>svg]:size-6'

export const TableInsert: FC<{ onInsert: (rows: number, columns: number, headers: boolean) => void; disabled: boolean; big?: boolean }> = ({ onInsert, disabled, big = false }) => {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<number | null>(3)
  const [columns, setColumns] = useState<number | null>(3)
  const [headers, setHeaders] = useState(true)
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      title="Insert a table"
      trigger={
        <button
          type="button"
          data-tool
          aria-label={big ? undefined : 'Insert a table'}
          disabled={disabled}
          className={
            big
              ? bigTool
              : 'grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-4'
          }
        >
          <Table />
          {big ? 'Table' : null}
        </button>
      }
    >
      <div className="flex w-56 flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-[0.8rem] font-semibold text-ink">
            Rows
            <NumberInput size="sm" min={1} max={20} value={rows} onValueChange={setRows} />
          </label>
          <label className="flex flex-col gap-1 text-[0.8rem] font-semibold text-ink">
            Columns
            <NumberInput size="sm" min={1} max={10} value={columns} onValueChange={setColumns} />
          </label>
        </div>
        <Switch size="sm" checked={headers} onCheckedChange={setHeaders}>
          Header row
        </Switch>
        <Button
          size="sm"
          onClick={() => {
            setOpen(false)
            onInsert(Math.min(20, Math.max(1, rows ?? 3)), Math.min(10, Math.max(1, columns ?? 3)), headers)
          }}
        >
          Insert {rows ?? 3} × {columns ?? 3}
        </Button>
      </div>
    </Popover>
  )
}

/**
 * Everything the toolbar and the ribbon do, in one place: what's at the cursor (for
 * pressed states and menus), and the changes (blocks, fonts and sizes, marks, colors,
 * tables). Both layouts call this, so they can't drift apart.
 */
export function useEditorTools({ fonts, sizes, disabled }: { fonts: FontOption[]; sizes: number[]; disabled: boolean }) {
  const [editor] = useLexicalComposerContext()
  const [state, setState] = useState<ToolbarState>(EMPTY)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const mod = isApple() ? '⌘' : 'Ctrl+'

  /** Reads what's at the cursor, for the buttons' pressed states and menus */
  const read = useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return
    const anchor = selection.anchor.getNode()
    // The block the cursor's in: a child of the root, or of a table cell
    const block =
      anchor.getKey() === 'root'
        ? anchor
        : ($findMatchingParent(anchor, (n) => {
            const parent = n.getParent()
            return parent !== null && $isRootOrShadowRoot(parent)
          }) ?? anchor.getTopLevelElementOrThrow())
    let type: BlockType = 'paragraph'
    if ($isListNode(block)) {
      const list = $getNearestNodeOfType(anchor, ListNode) ?? block
      type = list.getListType() === 'number' ? 'number' : 'bullet'
    } else if ($isHeadingNode(block)) {
      const tag = block.getTag()
      type = tag === 'h1' || tag === 'h2' || tag === 'h3' ? tag : 'h3'
    } else if ($isQuoteNode(block)) type = 'quote'
    else if ($isCalloutNode(block)) type = 'callout'
    else if ($isCodeNode(block)) type = 'code'
    setState({
      block: type,
      font: $getSelectionStyleValueForProperty(selection, 'font-family', ''),
      size: $getSelectionStyleValueForProperty(selection, 'font-size', ''),
      formats: new Set(FORMATS.map((f) => f.format).filter((f) => selection.hasFormat(f))),
      color: $getSelectionStyleValueForProperty(selection, 'color', ''),
      background: $getSelectionStyleValueForProperty(selection, 'background-color', ''),
      underlineColor: $getSelectionStyleValueForProperty(selection, 'text-decoration-color', ''),
      borderColor: $getSelectionStyleValueForProperty(selection, 'border-color', ''),
      inTable: $getTableCellNodeFromLexicalNode(anchor) !== null,
      headerRow: $hasHeaderRow(),
      inCode: type === 'code',
      callout: $isCalloutNode(block) ? block.getTone() : null,
      faq: (() => {
        const at = $faqAtSelection()
        return at ? (at.inQuestion ? 'question' : 'answer') : null
      })(),
      link: (() => {
        const link = $findMatchingParent(anchor, $isLinkNode)
        return link && $isLinkNode(link) ? link.getURL() : ''
      })(),
    })
  }, [])

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ editorState }) => editorState.read(read)),
        editor.registerCommand(
          SELECTION_CHANGE_COMMAND,
          () => {
            read()
            return false
          },
          COMMAND_PRIORITY_LOW
        ),
        editor.registerCommand(CAN_UNDO_COMMAND, (v) => (setCanUndo(v), false), COMMAND_PRIORITY_LOW),
        editor.registerCommand(CAN_REDO_COMMAND, (v) => (setCanRedo(v), false), COMMAND_PRIORITY_LOW)
      ),
    [editor, read]
  )

  /** Changes the selection, then puts the cursor back in the text */
  const change = (fn: () => void, { focus = true } = {}) => {
    editor.update(
      () => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) fn()
      },
      // Without focus (a color still being chosen), leave the page's selection alone too:
      // restoring it would pull focus into the text and close the color panel
      focus ? undefined : { tag: SKIP_DOM_SELECTION_TAG }
    )
    if (focus) editor.focus()
  }

  const setBlock = (type: BlockType) => {
    // A question is a line of its own, not a heading or a list; its answer can be anything
    if (state.faq === 'question') return
    if (type === 'bullet' || type === 'number') {
      editor.dispatchCommand(state.block === type ? REMOVE_LIST_COMMAND : type === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined)
      editor.focus()
      return
    }
    change(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      // Choosing the block it's already in turns it back into a paragraph
      const target = state.block === type ? 'paragraph' : type
      $setBlocksType(selection, () =>
        target === 'paragraph'
          ? $createParagraphNode()
          : target === 'quote'
            ? $createQuoteNode()
            : target === 'callout'
              ? $createCalloutNode()
              : target === 'code'
                ? $createCodeNode()
                : $createHeadingNode(target)
      )
    })
  }

  /** The tone of the callout the cursor's in */
  const setCalloutTone = (tone: CalloutTone) =>
    change(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const callout = $findMatchingParent(selection.anchor.getNode(), $isCalloutNode)
      if ($isCalloutNode(callout)) callout.setTone(tone)
    })

  const style = (patch: Record<string, string | null>, focus = true) =>
    change(
      () => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) $patchStyleText(selection, patch)
      },
      { focus }
    )

  /** Underline color only shows on underlined text, so picking one underlines it too */
  const underlineColor = (color: string | null, live?: boolean) => {
    style({ 'text-decoration-color': color }, !live)
    if (color && !state.formats.has('underline')) editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
  }

  /** A border is a thin rounded box around the words; "None" takes all of it off */
  const borderColor = (color: string | null, live?: boolean) =>
    style(
      color
        ? { 'border-color': color, 'border-style': 'solid', 'border-width': '1.5px', 'border-radius': '4px', padding: '0 0.2em' }
        : { 'border-color': null, 'border-style': null, 'border-width': null, 'border-radius': null, padding: null },
      !live
    )

  const currentSize = Number.parseInt(state.size, 10) || 16
  const stepSize = (by: 1 | -1) => {
    const next = by > 0 ? sizes.find((s) => s > currentSize) : [...sizes].reverse().find((s) => s < currentSize)
    if (next) style({ 'font-size': `${next}px` })
  }

  const table = (fn: () => void) => change(fn)

  /** A new table at the cursor: a header row only, as a header column too would make every row's first cell a heading */
  const insertTable = (rows: number, columns: number, headers: boolean) => {
    editor.update(() =>
      $replacingEmptyLine(() =>
        editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: String(rows), columns: String(columns), includeHeaders: headers ? { rows: true, columns: false } : false })
      )
    )
    editor.focus()
  }

  const blockInfo = BLOCKS.find((b) => b.type === state.block) ?? BLOCKS[0]
  /** A family's own name: '"Lato", sans-serif' → "Lato" */
  const firstFamily = (family: string) => family.split(',')[0].trim().replace(/^["']|["']$/g, '')
  const fontLabel =
    fonts.find((f) => f.value && firstFamily(f.value) === firstFamily(state.font))?.label ?? (state.font ? firstFamily(state.font) : (fonts[0]?.label ?? 'Font'))

  /** A typed font: a listed one by name, "Default" or nothing for the page's own, or any family name */
  const commitFont = (text: string, option?: { value: string }) => {
    if (option) return style({ 'font-family': option.value || null })
    const t = text.trim()
    const listed = fonts.find((f) => f.label.toLowerCase() === t.toLowerCase())
    if (!t || listed?.value === '') return style({ 'font-family': null })
    if (listed) return style({ 'font-family': listed.value })
    // Only a name (letters, numbers, spaces, hyphens), so nothing else lands in the style
    if (!/^[\w\s-]{1,48}$/.test(t)) return false
    style({ 'font-family': `"${t}", sans-serif` })
  }

  /** A typed size: "18" or "18px", from 8 to 96; nothing or "Default" for the normal size */
  const commitSize = (text: string) => {
    const t = text.trim().toLowerCase()
    if (!t || t === 'default') return style({ 'font-size': null })
    const n = Number(t.replace(/px$/, ''))
    if (!Number.isFinite(n) || n < 8 || n > 96) return false
    style({ 'font-size': `${Math.round(n)}px` })
  }
  /** The FAQ tools: a question after the cursor's, taking the cursor's out, or the whole FAQ */
  const faq = (action: 'add' | 'remove' | 'delete') =>
    change(() => {
      const at = $faqAtSelection()
      if (!at) return
      if (action === 'add') $addFaqItemAfter(at.item)
      else if (action === 'remove') $removeFaqItem(at.item)
      else if (at.faq) $removeFaq(at.faq)
    })

  const off = disabled
  // Code blocks are plain text: no fonts or marks inside them
  const noText = off || state.inCode

  /** Links the selection (or takes the link off, with null), then puts the cursor back */
  const setLink = (url: string | null) => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
    editor.focus()
  }

  return { setLink, editor, state, canUndo, canRedo, mod, change, setBlock, setCalloutTone, faq, style, underlineColor, borderColor, currentSize, stepSize, table, insertTable, blockInfo, fontLabel, commitFont, commitSize, off, noText }
}

/**
 * The WAI-ARIA toolbar pattern for a row of controls: one Tab stop, then the arrow keys
 * (and Home/End) move between them. Spread onKeyDown onto the toolbar.
 */
export function useRovingFocus(barRef: RefObject<HTMLElement | null>) {
  // Roving focus: arrows move between the toolbar's controls; Tab leaves it
  const tools = () => [...(barRef.current?.querySelectorAll<HTMLElement>('[data-tool]:not(:disabled)') ?? [])]
  useEffect(() => {
    const all = tools()
    all.forEach((el, i) => el.setAttribute('tabindex', i === 0 ? '0' : '-1'))
  })
  const onKeyDown = (e: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    const all = tools()
    const at = all.indexOf(document.activeElement as HTMLElement)
    if (at < 0) return
    e.preventDefault()
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (at + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length
    all.forEach((el, i) => el.setAttribute('tabindex', i === next ? '0' : '-1'))
    all[next].focus()
  }
  return onKeyDown
}

/**
 * Cut, copy, and paste through the clipboard, for the ribbon and the context menu. Copy and
 * cut put both HTML and plain text on it, so formatting survives a paste into another
 * editor. Pasting reads it, which the browser may ask permission for; when that's refused,
 * the cursor goes back to the text, where ⌘/Ctrl+V always works.
 */
export function useClipboard() {
  const [editor] = useLexicalComposerContext()

  const run = (fn: () => void) => {
    editor.update(() => {
      if ($isRangeSelection($getSelection())) fn()
    })
    editor.focus()
  }

  const copy = async () => {
    const { text, html } = editor.getEditorState().read(() => {
      const selection = $getSelection()
      return { text: selection?.getTextContent() ?? '', html: selection ? $generateHtmlFromNodes(editor, selection) : '' }
    })
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })])
    } catch {
      // Rich copies aren't everywhere (or allowed); the words alone still go
      await navigator.clipboard?.writeText(text).catch(() => {})
    }
  }

  const cut = async () => {
    await copy()
    run(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) selection.removeText()
    })
  }

  const paste = async (plain = false) => {
    try {
      if (!plain && navigator.clipboard.read) {
        for (const item of await navigator.clipboard.read()) {
          if (item.types.includes('text/html')) {
            const html = await (await item.getType('text/html')).text()
            run(() => $insertNodes($generateNodesFromDOM(editor, new DOMParser().parseFromString(html, 'text/html'))))
            return
          }
        }
      }
      const text = await navigator.clipboard.readText()
      run(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) selection.insertRawText(text)
      })
    } catch {
      editor.focus()
    }
  }

  return { copy, cut, paste, run }
}
