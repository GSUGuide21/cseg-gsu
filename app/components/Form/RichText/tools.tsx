'use client'

import { $createCodeNode, $isCodeNode } from '@lexical/code-core'
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
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
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  type ElementFormatType,
  type LexicalEditor,
  type TextFormatType,
} from 'lexical'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  Info,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Pilcrow,
  Quote,
  SquareCode,
  Strikethrough,
  Subscript,
  Superscript,
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
import type { ColumnsLayout, LineHeight } from '@/lib/richtext/blocks'
import { linkFromInput } from '@/lib/safeUrl'

import { Button } from '../../Button'
import { Popover } from '../../Popover'
import { Tooltip } from '../../Tooltip'
import { NumberInput } from '../Number'
import { Switch } from '../Switch'
import { $hasHeaderRow, $replacingEmptyLine, $cellBackgroundAtSelection, $setCellBackground, $hasHeaderColumn, $hasRowStriping } from './commands'
import { $lineHeightAtSelection, $setLineHeight } from './lineHeight'
import { $addFaqItemAfter, $columnsAround, $createCalloutNode, $faqAtSelection, $isCalloutNode, $removeColumns, $removeFaq, $removeFaqItem, $setColumnsLayout } from './nodes'
import type { BlockType, FontOption } from './types'

export const BLOCKS: { type: BlockType; label: string; icon: ReactNode }[] = [
  { type: 'paragraph', label: 'Paragraph', icon: <Pilcrow /> },
  { type: 'h1', label: 'Heading 1', icon: <Heading1 /> },
  { type: 'h2', label: 'Heading 2', icon: <Heading2 /> },
  { type: 'h3', label: 'Heading 3', icon: <Heading3 /> },
  { type: 'h4', label: 'Heading 4', icon: <Heading4 /> },
  { type: 'quote', label: 'Quote', icon: <Quote /> },
  { type: 'callout', label: 'Callout', icon: <Info /> },
  { type: 'bullet', label: 'Bulleted list', icon: <List /> },
  { type: 'number', label: 'Numbered list', icon: <ListOrdered /> },
  { type: 'check', label: 'Checklist', icon: <ListChecks /> },
  { type: 'code', label: 'Code block', icon: <SquareCode /> },
]

export const FORMATS: { format: TextFormatType; label: string; keys?: string; icon: ReactNode }[] = [
  { format: 'bold', label: 'Bold', keys: 'B', icon: <Bold /> },
  { format: 'italic', label: 'Italic', keys: 'I', icon: <Italic /> },
  { format: 'underline', label: 'Underline', keys: 'U', icon: <Underline /> },
  { format: 'strikethrough', label: 'Strikethrough', icon: <Strikethrough /> },
  { format: 'highlight', label: 'Highlight', icon: <Highlighter /> },
  { format: 'code', label: 'Inline code', keys: 'E', icon: <Code /> },
  { format: 'subscript', label: 'Subscript', icon: <Subscript /> },
  { format: 'superscript', label: 'Superscript', icon: <Superscript /> },
]

export const ALIGNMENTS: { format: ElementFormatType; label: string; icon: ReactNode }[] = [
  { format: 'left', label: 'Align left', icon: <AlignLeft /> },
  { format: 'center', label: 'Center', icon: <AlignCenter /> },
  { format: 'right', label: 'Align right', icon: <AlignRight /> },
  { format: 'justify', label: 'Justify', icon: <AlignJustify /> },
]

const LIST_COMMANDS = { bullet: INSERT_UNORDERED_LIST_COMMAND, number: INSERT_ORDERED_LIST_COMMAND, check: INSERT_CHECK_LIST_COMMAND }

/** Turns the selected lines into a kind of block. Runs inside editor.update. */
export const $setBlockType = (editor: LexicalEditor, type: BlockType) => {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return
  if (type === 'bullet' || type === 'number' || type === 'check') {
    editor.dispatchCommand(LIST_COMMANDS[type], undefined)
    return
  }
  $setBlocksType(selection, () =>
    type === 'paragraph'
      ? $createParagraphNode()
      : type === 'quote'
        ? $createQuoteNode()
        : type === 'callout'
          ? $createCalloutNode()
          : type === 'code'
            ? $createCodeNode()
            : $createHeadingNode(type)
  )
}

export interface ToolbarState {
  block: BlockType
  /** How the cursor's block is aligned ("" for the default) */
  align: ElementFormatType
  font: string
  size: string
  formats: Set<TextFormatType>
  /** The selection's colors ("" for none or mixed) */
  color: string
  background: string
  underlineColor: string
  underlineStyle: string
  borderColor: string
  borderStyle: string
  borderWidth: string
  inTable: boolean
  /** Whether words are selected (for a comment on them) */
  textSelected: boolean
  /** Whether that table's first row is headers */
  headerRow: boolean
  /** Whether its first column is headers */
  headerColumn: boolean
  /** Whether it shades every other row */
  striped: boolean
  inCode: boolean
  /** The callout the cursor's in, by its tone (null for none) */
  callout: CalloutTone | null
  /** Whether the cursor's in an FAQ's question or answer (null for neither) */
  faq: 'question' | 'answer' | null
  /** The row of columns the cursor's in, by its layout (null for none) */
  columns: ColumnsLayout | null
  /** The link the cursor's in ("" for none) */
  link: string
  /** The cursor's block's line spacing ("" for the usual) */
  lineHeight: LineHeight | ''
  /** The background of the table cell the cursor's in ("" for none) */
  cellBackground: string
}

const EMPTY: ToolbarState = { block: 'paragraph', align: '', font: '', size: '', formats: new Set(), color: '', background: '', underlineColor: '', underlineStyle: '', borderColor: '', borderStyle: '', borderWidth: '', inTable: false, textSelected: false, headerRow: false, headerColumn: false, striped: false, inCode: false, callout: null, faq: null, columns: null, link: '', lineHeight: '', cellBackground: '' }

/** Unsized text, in points: the page's 16px */
const DEFAULT_POINTS = 12

/** A size as the size box shows it. Text sized before the box went to points is in pixels, kept as saved. */
export const pointsOf = (size: string) => {
  const [, n, unit] = /^([\d.]+)(px|pt)$/.exec(size.trim()) ?? []
  if (!n) return DEFAULT_POINTS
  return unit === 'pt' ? Number(n) : Math.round(Number(n) * 1.5) / 2
}

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
export const bigTool = 'flex h-15 min-w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-2 text-[0.72rem] font-semibold text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-brand-tint aria-pressed:text-brand [&>svg]:size-6'

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

/** A new border's color, where the color panel starts */
export const BORDER_START = '#0039a6'

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
      const listType = list.getListType()
      type = listType === 'number' || listType === 'check' ? listType : 'bullet'
    } else if ($isHeadingNode(block)) {
      const tag = block.getTag()
      const hs = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
      type = hs.includes(tag) ? tag : 'h4'
    } else if ($isQuoteNode(block)) type = 'quote'
    else if ($isCalloutNode(block)) type = 'callout'
    else if ($isCodeNode(block)) type = 'code'
    // Alignment is the line's own: a list item's, not the whole list's
    const line = $findMatchingParent(anchor, (n) => $isElementNode(n) && !n.isInline())
    setState({
      block: type,
      align: $isElementNode(line) ? line.getFormatType() : '',
      font: $getSelectionStyleValueForProperty(selection, 'font-family', ''),
      size: $getSelectionStyleValueForProperty(selection, 'font-size', ''),
      formats: new Set(FORMATS.map((f) => f.format).filter((f) => selection.hasFormat(f))),
      color: $getSelectionStyleValueForProperty(selection, 'color', ''),
      background: $getSelectionStyleValueForProperty(selection, 'background-color', ''),
      underlineColor: $getSelectionStyleValueForProperty(selection, 'text-decoration-color', ''),
      underlineStyle: $getSelectionStyleValueForProperty(selection, 'text-decoration-style', ''),
      borderColor: $getSelectionStyleValueForProperty(selection, 'border-color', ''),
      borderStyle: $getSelectionStyleValueForProperty(selection, 'border-style', ''),
      borderWidth: $getSelectionStyleValueForProperty(selection, 'border-width', ''),
      inTable: $getTableCellNodeFromLexicalNode(anchor) !== null,
      textSelected: !selection.isCollapsed(),
      headerRow: $hasHeaderRow(),
      headerColumn: $hasHeaderColumn(),
      striped: $hasRowStriping(),
      inCode: type === 'code',
      callout: $isCalloutNode(block) ? block.getTone() : null,
      faq: (() => {
        const at = $faqAtSelection()
        return at ? (at.inQuestion ? 'question' : 'answer') : null
      })(),
      columns: $columnsAround(anchor)?.getLayout() ?? null,
      lineHeight: $lineHeightAtSelection(),
      cellBackground: $cellBackgroundAtSelection(),
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
    if (state.block === type && (type === 'bullet' || type === 'number' || type === 'check')) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
      editor.focus()
      return
    }
    // Choosing the block it's already in turns it back into a paragraph
    change(() => $setBlockType(editor, state.block === type ? 'paragraph' : type))
  }

  /** Aligns the cursor's block; the alignment it already has goes back to the default */
  const setAlign = (format: ElementFormatType) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, state.align === format ? '' : format)
    editor.focus()
  }

  /** Moves the cursor's block in or out a step; a list item nests under the one above */
  const indent = (by: 1 | -1) => {
    editor.dispatchCommand(by > 0 ? INDENT_CONTENT_COMMAND : OUTDENT_CONTENT_COMMAND, undefined)
    editor.focus()
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

  /** An underline's color and type only show on underlined text, so picking one underlines it too */
  const underlined = () => {
    if (!state.formats.has('underline')) editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
  }
  const underlineColor = (color: string | null, live?: boolean) => {
    style({ 'text-decoration-color': color }, !live)
    if (color) underlined()
  }
  /** Solid is what an underline already is, so it isn't saved */
  const setUnderlineType = (type: string) => {
    style({ 'text-decoration-style': type === 'solid' ? null : type }, false)
    underlined()
  }
  /** Back to a plain underline, in the text's own color */
  const clearUnderline = () => style({ 'text-decoration-color': null, 'text-decoration-style': null })

  /** A border is a box around the words: each change keeps the rest of its look, or starts from the usual one */
  const border = (look: { color?: string; type?: string; width?: string }, focus: boolean) =>
    style(
      {
        'border-color': look.color ?? (state.borderColor || BORDER_START),
        'border-style': look.type ?? (state.borderStyle || 'solid'),
        'border-width': look.width ?? (state.borderWidth || '1.5px'),
        'border-radius': '4px',
        padding: '0 0.2em',
      },
      focus
    )
  /** "None" takes all of it off */
  const borderColor = (color: string | null, live?: boolean) =>
    color ? border({ color }, !live) : style({ 'border-color': null, 'border-style': null, 'border-width': null, 'border-radius': null, padding: null }, !live)
  /** Two lines need 3px to show as two */
  const setBorderType = (type: string) => border({ type, width: type === 'double' && parseFloat(state.borderWidth || '0') < 3 ? '3px' : undefined }, false)
  const setBorderWidth = (width: string) => border({ width }, false)

  const currentSize = pointsOf(state.size)
  const stepSize = (by: 1 | -1) => {
    const next = by > 0 ? sizes.find((s) => s > currentSize) : [...sizes].reverse().find((s) => s < currentSize)
    if (next) style({ 'font-size': `${next}pt` })
  }

  // Not through change, which needs a text cursor: merging works on cells selected across
  const table = (fn: () => void, { focus = true } = {}) => {
    editor.update(fn, focus ? undefined : { tag: SKIP_DOM_SELECTION_TAG })
    if (focus) editor.focus()
  }

  /** The line spacing of the blocks the selection touches ("" for the usual) */
  const setLineHeight = (value: LineHeight | '') => change(() => $setLineHeight(value))

  /** The selected cells' background; while a color's still being chosen, without moving focus */
  const setCellBackground = (color: string | null, focus = true) => table(() => $setCellBackground(color), { focus })

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

  /** A typed size: "18" or "18pt", from 6 to 96, to the half point; nothing or "Default" for the normal size */
  const commitSize = (text: string) => {
    const t = text.trim().toLowerCase()
    if (!t || t === 'default') return style({ 'font-size': null })
    const n = Number(t.replace(/\s*pt$/, ''))
    if (!Number.isFinite(n) || n < 6 || n > 96) return false
    style({ 'font-size': `${Math.round(n * 2) / 2}pt` })
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

  /** The columns tools: another layout for the row the cursor's in, or its writing put back in the page */
  const columns = (to: ColumnsLayout | 'remove') =>
    change(() => {
      const selection = $getSelection()
      const row = $isRangeSelection(selection) ? $columnsAround(selection.anchor.getNode()) : null
      if (!row) return
      if (to === 'remove') $removeColumns(row)
      else $setColumnsLayout(row, to)
    })

  const off = disabled
  // Code blocks are plain text: no fonts or marks inside them
  const noText = off || state.inCode

  /** Links the selection (or takes the link off, with null), then puts the cursor back */
  const setLink = (url: string | null) => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
    editor.focus()
  }

  return { setLink, editor, state, canUndo, canRedo, mod, change, setBlock, setAlign, indent, setCalloutTone, faq, columns, setLineHeight, setCellBackground, style, underlineColor, setUnderlineType, clearUnderline, borderColor, setBorderType, setBorderWidth, currentSize, stepSize, table, insertTable, blockInfo, fontLabel, commitFont, commitSize, off, noText }
}

/**
 * The WAI-ARIA toolbar pattern for a row of controls: one Tab stop, then the arrow keys
 * (and Home/End) move between them. Spread onKeyDown onto the toolbar.
 */
export function useRovingFocus(barRef: RefObject<HTMLElement | null>) {
  // Roving focus: arrows move between the toolbar's controls; Tab leaves it
  // Not those in a toolbar of their own inside this one (the ribbon's More)
  const tools = () => [...(barRef.current?.querySelectorAll<HTMLElement>('[data-tool]:not(:disabled)') ?? [])].filter((el) => el.closest('[role="toolbar"]') === barRef.current)
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
