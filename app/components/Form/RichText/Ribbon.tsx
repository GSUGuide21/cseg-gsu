'use client'

import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/extension'
import { FORMAT_TEXT_COMMAND, REDO_COMMAND, UNDO_COMMAND } from 'lexical'
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Asterisk,
  AtSign,
  Baseline,
  Bookmark,
  ChevronDown,
  ChevronUp,
  AppWindow,
  MessageSquarePlus,
  ArrowDownAZ,
  ArrowDownZA,
  Columns3Cog,
  PanelLeft,
  Rows3,
  Combine,
  Keyboard,
  Maximize2,
  Minimize2,
  Search,
  SplitSquareHorizontal,
  Clapperboard,
  Columns2,
  Columns3,
  Images,
  Paperclip,
  ClipboardPaste,
  ClipboardType,
  Clock,
  Copy,
  Footprints,
  ImageIcon,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Info,
  LayoutGrid,
  List,
  ListChecks,
  ListOrdered,
  MessageCircleQuestion,
  Minus,
  MoreHorizontal,
  MousePointerClick,
  PaintBucket,
  PanelTop,
  Pilcrow,
  Pin,
  Plus,
  Quote,
  Redo2,
  RectangleHorizontal,
  RemoveFormatting,
  Scissors,
  SeparatorHorizontal,
  SquareCode,
  Tag,
  Trash2,
  Trophy,
  Undo2,
  CalendarDays,
  ChartNoAxesColumn,
  CalendarClock as ScheduleIcon,
  MapPinned,
  MessageSquareQuote,
  Gem,
} from 'lucide-react'
import { Children, createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type FC, type KeyboardEvent, type ReactElement, type ReactNode, type RefObject } from 'react'

import { cn } from '@/lib/cn'
import { CALLOUT_TONE_LIST, CALLOUT_TONES, COLUMN_LAYOUT_LIST, COLUMN_LAYOUTS, LINE_HEIGHT_LIST, LINE_HEIGHTS } from '@/lib/richtext/blocks'

import { ActionMenu } from '../../ActionMenu'
import { Popover } from '../../Popover'
import { Tooltip } from '../../Tooltip'
import { BorderTool, ColorTool, INK_SWATCHES, TINT_SWATCHES, UnderlineTool } from './ColorTool'
import { ToolCombobox } from './Combobox'
import { $clearFormatting, $toggleHeaderColumn, $toggleHeaderRow, $toggleRowStriping, TABLE_ACTIONS } from './commands'
import { CalloutIcon, useBlockDialogs } from './nodes'
import { ALIGNMENTS, BORDER_START, FORMATS, LinkTool, MenuButton, TableInsert, ToolButton, bigTool, useClipboard, useEditorTools, useRovingFocus } from './tools'
import { SymbolTool } from './Symbols'
import type { BlockType, FontOption } from './types'
import { useEditorUI } from './ui'

type RibbonTab = 'home' | 'insert' | 'format' | 'table' | 'callout' | 'faq' | 'columns'

/** A big ribbon button: icon over its label. Mousedown doesn't take focus, so the selection stays put. */
const BigButton: FC<{ label: string; icon: ReactNode; pressed?: boolean; disabled?: boolean; onClick: () => void; hint?: string }> = ({ label, icon, pressed, disabled, onClick, hint }) => {
  const button = (
    <button type="button" data-tool aria-pressed={pressed} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className={bigTool}>
      {icon}
      {label}
    </button>
  )
  return hint ? (
    <Tooltip content={hint} delay={500}>
      {button}
    </Tooltip>
  ) : (
    button
  )
}

/** A small ribbon button with its label beside the icon */
const LabeledButton: FC<{ label: string; icon: ReactNode; danger?: boolean; disabled?: boolean; onClick: () => void }> = ({ label, icon, danger, disabled, onClick }) => (
  <button
    type="button"
    data-tool
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={cn(
      'flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-md pr-2.5 pl-2 text-[0.8rem] font-semibold transition-colors [&>svg]:size-4 [&>svg]:shrink-0',
      'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40',
      danger ? 'text-danger hover:bg-danger/10' : 'text-ink-soft hover:bg-fill hover:text-ink'
    )}
  >
    {icon}
    {label}
  </button>
)

/** How many rows of big buttons the panel is using */
const RowsContext = createContext(1)

/**
 * A labeled set of controls in a ribbon panel, its name underneath as in a word processor.
 * With `wraps`, its big buttons take two rows when the panel can't fit them in one.
 */
const Group: FC<{ label: string; children: ReactNode; className?: string; wraps?: boolean }> = ({ label, children, className, wraps }) => {
  const rows = useContext(RowsContext)
  return (
    <div role="group" aria-label={label} className="flex shrink-0 flex-col items-stretch justify-between gap-1 border-r border-line px-2 last:border-r-0">
      <div className={cn('flex min-h-15 items-center gap-1', className, wraps && rows === 2 && 'grid grid-flow-col grid-rows-2 gap-0.5')}>{children}</div>
      <span aria-hidden className="text-center text-[0.68rem] font-semibold tracking-wide text-muted">
        {label}
      </span>
    </div>
  )
}

/** The groups that don't fit in the panel, behind a More button. A tool that returns to the text closes it. */
const Overflow: FC<{ groups: ReactNode[] }> = ({ groups }) => {
  const [open, setOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement>(null)
  const onKeyDown = useRovingFocus(toolsRef)
  return (
    <div className="ml-auto flex shrink-0 items-center px-1">
      <Popover
        open={open}
        onOpenChange={setOpen}
        aria-label="More tools"
        align="end"
        // Above the site's header, like the color panels that open from it
        className="z-60 max-w-[min(36rem,calc(100vw-1rem))]"
        trigger={
          <button type="button" data-tool onMouseDown={(e) => e.preventDefault()} className={cn(bigTool, 'aria-expanded:bg-fill aria-expanded:text-ink')}>
            <MoreHorizontal />
            More
          </button>
        }
      >
        <div ref={toolsRef} role="toolbar" aria-label="More tools" onKeyDown={onKeyDown} className="flex flex-wrap gap-y-2 *:border-r-0">
          {groups}
        </div>
      </Popover>
    </div>
  )
}

/**
 * Fits a panel to its width: if its groups don't fit, big buttons take two rows, and if they
 * still don't, groups go behind More from the end. It's worked out from the start for each
 * panel and width, before anything's drawn, so everything comes back as the editor gets wider.
 */
const useRibbonFit = (panelRef: RefObject<HTMLDivElement | null>, view: string, groups: number) => {
  const [width, setWidth] = useState(0)
  const key = `${view}/${width}`
  const [fit, setFit] = useState({ key, rows: 1, hidden: 0 })
  const { rows, hidden } = fit.key === key ? fit : { rows: 1, hidden: 0 }

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setWidth(panel.clientWidth))
    observer.observe(panel)
    return () => observer.disconnect()
  }, [panelRef, view])

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel || panel.scrollWidth <= panel.clientWidth) return
    if (rows === 1) setFit({ key, rows: 2, hidden: 0 })
    else if (hidden < groups) setFit({ key, rows, hidden: hidden + 1 })
  }, [panelRef, key, rows, hidden, groups])

  return { rows, hidden }
}

/** The heading styles, each shown as itself */
const STYLES: { type: BlockType; label: string; preview: string }[] = [
  { type: 'paragraph', label: 'Normal', preview: 'text-[0.85rem]' },
  { type: 'h1', label: 'Heading 1', preview: 'text-[1rem] font-extrabold' },
  { type: 'h2', label: 'Heading 2', preview: 'text-[0.92rem] font-bold' },
  { type: 'h3', label: 'Heading 3', preview: 'text-[0.85rem] font-bold' },
  { type: 'h4', label: 'Heading 4', preview: 'text-[0.78rem] font-bold' },
  { type: 'h5', label: 'Heading 5', preview: 'text-[0.72rem] font-bold' },
  { type: 'h6', label: 'Heading 6', preview: 'text-[0.65rem] font-bold' },
]

/**
 * The ribbon: the editor's tools on tabs, in labeled groups, like a word processor's.
 * Home (clipboard, font, paragraph, styles), Insert, Format (colors, layout), and a Table tab that
 * appears while the cursor's in a table. Undo and redo stay at the right of the tabs.
 *
 * When a panel doesn't fit, its big buttons take up to two rows, then groups from the end
 * move behind a More button, and they come back as the editor gets wider.
 *
 * Collapse it to just the tabs (the arrow at the right, or double-click a tab): a tab then
 * opens its panel over the text until a tool is used or focus moves on.
 *
 * The tabs are WAI-ARIA tabs (arrow keys between them); each panel is a toolbar, one Tab
 * stop with the arrow keys between its controls.
 */
export const Ribbon: FC<{ fonts: FontOption[]; sizes: number[]; disabled: boolean }> = ({ fonts, sizes, disabled }) => {
  const t = useEditorTools({ fonts, sizes, disabled })
  const ui = useEditorUI()
  const { editor, state, off, noText } = t
  const clipboard = useClipboard()
  const blocks = useBlockDialogs()
  const [tab, setTab] = useState<RibbonTab>('home')
  const [collapsed, setCollapsed] = useState(false)
  const [peek, setPeek] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const ribbonRef = useRef<HTMLDivElement>(null)
  const onToolKeyDown = useRovingFocus(panelRef)
  const id = useId()

  // The Table and Callout tabs go when the cursor leaves the table or callout
  const shown: RibbonTab = (tab === 'table' && !state.inTable) || (tab === 'callout' && !state.callout) || (tab === 'faq' && !state.faq) || (tab === 'columns' && !state.columns) ? 'home' : tab
  const tabs: { id: RibbonTab; label: string; contextual?: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'insert', label: 'Insert' },
    { id: 'format', label: 'Format' },
    ...(state.inTable ? [{ id: 'table' as const, label: 'Table', contextual: 'the table' }] : []),
    ...(state.callout ? [{ id: 'callout' as const, label: 'Callout', contextual: 'the callout' }] : []),
    ...(state.faq ? [{ id: 'faq' as const, label: 'FAQ', contextual: 'the FAQ' }] : []),
    ...(state.columns ? [{ id: 'columns' as const, label: 'Columns', contextual: 'the columns' }] : []),
  ]

  // A peeked panel closes once focus leaves the ribbon (a tool sends it back to the text)
  useEffect(() => {
    if (!peek) return
    const ribbon = ribbonRef.current
    const onFocusOut = (e: FocusEvent) => {
      if (!ribbon?.contains(e.relatedTarget as Node | null)) setPeek(false)
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!ribbon?.contains(e.target as Node)) setPeek(false)
    }
    ribbon?.addEventListener('focusout', onFocusOut)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      ribbon?.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [peek])

  const pick = (next: RibbonTab) => {
    setTab(next)
    if (collapsed) setPeek(true)
  }
  const onTabKeyDown = (e: KeyboardEvent) => {
    const at = tabs.findIndex((x) => x.id === shown)
    let next = -1
    if (e.key === 'ArrowRight') next = (at + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (at - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    else if (e.key === 'Escape' && peek) {
      setPeek(false)
      editor.focus()
      return
    } else return
    e.preventDefault()
    pick(tabs[next].id)
    document.getElementById(`${id}-${tabs[next].id}`)?.focus()
  }

  const format = (f: (typeof FORMATS)[number]['format']) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, f)
    editor.focus()
  }
  const block = (type: BlockType) => t.setBlock(type)
  const open = !collapsed || peek
  // Not in code, which is plain text, or an FAQ's question, a plain line that opens its answer
  const inLineOff = off || state.inCode || state.faq === 'question'

  const panels: Record<RibbonTab, ReactElement<{ children: ReactNode }>> = {
    home: (
      <>
        <Group label="Clipboard">
          <BigButton label="Paste" icon={<ClipboardPaste />} disabled={off} hint={`Paste (${t.mod}V)`} onClick={() => clipboard.paste()} />
          <div className="flex flex-col gap-0.5">
            <LabeledButton label="Cut" icon={<Scissors />} disabled={off} onClick={clipboard.cut} />
            <LabeledButton label="Copy" icon={<Copy />} onClick={clipboard.copy} />
            <LabeledButton label="Plain text" icon={<ClipboardType />} disabled={off} onClick={() => clipboard.paste(true)} />
          </div>
        </Group>
        <Group label="Font" className="flex-col items-start justify-center gap-1">
          <div className="flex items-center gap-1">
            <ToolCombobox
              label="Font"
              display={t.fontLabel}
              filter
              disabled={noText}
              className="w-32"
              options={fonts.map((f) => ({ label: f.label, value: f.value, style: f.value ? { fontFamily: f.value } : undefined }))}
              onCommit={(text, option) => t.commitFont(text, option)}
            />
            <ToolCombobox
              label="Text size, in points"
              display={String(t.currentSize)}
              inputMode="numeric"
              disabled={noText}
              className="w-16"
              options={[...sizes.map((s) => ({ label: String(s), value: String(s) })), { label: 'Default', value: '' }]}
              onCommit={(text, option) => t.commitSize(option ? option.value : text)}
            />
            <ToolButton label="Smaller text" disabled={noText || t.currentSize <= sizes[0]} onClick={() => t.stepSize(-1)}>
              <Minus />
            </ToolButton>
            <ToolButton label="Larger text" disabled={noText || t.currentSize >= sizes[sizes.length - 1]} onClick={() => t.stepSize(1)}>
              <Plus />
            </ToolButton>
          </div>
          <div className="flex items-center gap-0.5">
            {FORMATS.map((f) => (
              <ToolButton key={f.format} label={f.keys ? `${f.label} (${t.mod}${f.keys})` : f.label} pressed={state.formats.has(f.format)} disabled={noText} onClick={() => format(f.format)}>
                {f.icon}
              </ToolButton>
            ))}
            <LinkTool current={state.link} disabled={noText} onLink={t.setLink} />
            <SymbolTool disabled={noText} />
            <ToolButton label="Clear formatting" disabled={noText} onClick={() => t.change($clearFormatting)}>
              <RemoveFormatting />
            </ToolButton>
          </div>
        </Group>
        <Group label="Paragraph" wraps>
          <BigButton label="Bullets" icon={<List />} pressed={state.block === 'bullet'} disabled={off} onClick={() => block('bullet')} />
          <BigButton label="Numbers" icon={<ListOrdered />} pressed={state.block === 'number'} disabled={off} onClick={() => block('number')} />
          <BigButton label="Checklist" icon={<ListChecks />} pressed={state.block === 'check'} disabled={off} onClick={() => block('check')} />
          <BigButton label="Quote" icon={<Quote />} pressed={state.block === 'quote'} disabled={off} onClick={() => block('quote')} />
          <ActionMenu
            label="Line spacing"
            align="start"
            trigger={<MenuButton label={`Line spacing: ${state.lineHeight ? LINE_HEIGHTS[state.lineHeight] : 'usual'}`} display={<span className="text-[0.78rem] font-semibold">Spacing</span>} disabled={off || state.inCode} />}
            items={[
              { label: 'Usual', description: state.lineHeight === '' ? 'Current' : 'The site’s own, roomy for reading', onSelect: () => t.setLineHeight('') },
              ...LINE_HEIGHT_LIST.map((v) => ({ label: LINE_HEIGHTS[v], description: v === state.lineHeight ? 'Current' : undefined, onSelect: () => t.setLineHeight(v) })),
            ]}
          />
        </Group>
        <Group label="Styles" wraps>
          {STYLES.map((s) => (
            <button
              key={s.type}
              type="button"
              data-tool
              aria-pressed={state.block === s.type}
              disabled={off}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => block(s.type)}
              className={cn(
                'flex h-15 w-17 shrink-0 cursor-pointer flex-col justify-between rounded-lg border border-line bg-surface px-1.5 py-1.5 text-left transition-colors',
                'hover:border-brand-edge focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40',
                'aria-pressed:border-brand aria-pressed:bg-brand-tint'
              )}
            >
              <span aria-hidden className={cn('truncate leading-tight text-ink', s.preview)}>
                AaBb
              </span>
              <span className="text-[0.64rem] font-semibold whitespace-nowrap text-ink-soft">{s.label}</span>
            </button>
          ))}
        </Group>
      </>
    ),
    insert: (
      <>
        <Group label="Tables">
          <TableInsert
            big
            disabled={off || state.inTable || state.inCode}
            onInsert={t.insertTable}
          />
        </Group>
        <Group label="Media" wraps>
          <BigButton label="Image" icon={<ImageIcon />} disabled={off || state.inCode} onClick={blocks.openImage} hint="Upload one, or use its address" />
          <BigButton label="Buttons" icon={<RectangleHorizontal />} disabled={off || state.inCode} onClick={blocks.openButtons} hint="Links styled as buttons, for the next step" />
          <BigButton label="Video" icon={<Clapperboard />} disabled={off || state.inCode} onClick={() => blocks.open('video')} hint="From a YouTube or Vimeo link" />
          <BigButton label="Gallery" icon={<Images />} disabled={off || state.inCode} onClick={() => blocks.open('gallery')} hint="Several photos together, each opening larger" />
          <BigButton label="File" icon={<Paperclip />} disabled={off || state.inCode} onClick={() => blocks.open('file')} hint="A card linking to a file to open or download" />
          <BigButton label="Embed" icon={<AppWindow />} disabled={off || state.inCode} onClick={() => blocks.open('embed')} hint="A Google Form, map, calendar, playlist, or post, shown in the page" />
        </Group>
        <Group label="Columns" wraps>
          {COLUMN_LAYOUT_LIST.map((layout) => (
            <BigButton
              key={layout}
              label={COLUMN_LAYOUTS[layout].label}
              icon={COLUMN_LAYOUTS[layout].count === 3 ? <Columns3 /> : <Columns2 />}
              disabled={off || state.inCode || state.inTable || !!state.faq || !!state.columns}
              onClick={() => blocks.insertColumns(layout)}
              hint={`Writing side by side: ${COLUMN_LAYOUTS[layout].hint.toLowerCase()}`}
            />
          ))}
        </Group>
        <Group label="Layout" wraps>
          <BigButton label="FAQ" icon={<MessageCircleQuestion />} disabled={off || state.inCode || !!state.faq} onClick={blocks.insertFaq} hint="Questions that open to their answers, typed in place" />
          <BigButton label="Steps" icon={<Footprints />} disabled={off || state.inCode} onClick={() => blocks.open('steps')} hint="Numbered steps, side by side" />
          <BigButton label="Ranking" icon={<Trophy />} disabled={off || state.inCode} onClick={() => blocks.open('ranking')} hint="A numbered top list, best first" />
          <BigButton label="Cards" icon={<LayoutGrid />} disabled={off || state.inCode} onClick={() => blocks.open('cards')} hint="One card, or a grid of them" />
          <BigButton label="References" icon={<Bookmark />} disabled={off || state.inCode} onClick={() => blocks.open('reference')} hint="Cards for things already on the site, kept up to date" />
          <BigButton label="Stats" icon={<ChartNoAxesColumn />} disabled={off || state.inCode} onClick={() => blocks.open('stats')} hint="Big numbers in a row, each with what it counts" />
          <BigButton label="Schedule" icon={<ScheduleIcon />} disabled={off || state.inCode} onClick={() => blocks.open('schedule')} hint="A day’s plan: when, what, and a line about it" />
          <BigButton label="Testimonial" icon={<MessageSquareQuote />} disabled={off || state.inCode} onClick={() => blocks.open('testimonial')} hint="A quote with who said it" />
        </Group>
        <Group label="Live" wraps>
          <BigButton label="Events" icon={<CalendarDays />} disabled={off || state.inCode} onClick={() => blocks.open('events')} hint="The next CSEG events from PIN, kept current" />
          <BigButton label="Core values" icon={<Gem />} disabled={off || state.inCode} onClick={() => blocks.open('core-values')} hint="The six values that spell CAMPUS, from the site's own list" />
          <BigButton label="Map place" icon={<MapPinned />} disabled={off || state.inCode} onClick={() => blocks.open('place')} hint="A small campus map pinned on a place" />
        </Group>
        <Group label="In the line" className="grid grid-cols-2 gap-x-1 gap-y-0.5">
          <LabeledButton label="Chip" icon={<AtSign />} disabled={inLineOff} onClick={() => blocks.open('chip')} />
          <LabeledButton label="Date or time" icon={<Clock />} disabled={inLineOff} onClick={() => blocks.open('datetime')} />
          <LabeledButton label="Badge" icon={<Tag />} disabled={inLineOff} onClick={() => blocks.open('badge')} />
          <LabeledButton label="Footnote" icon={<Asterisk />} disabled={inLineOff} onClick={() => blocks.open('footnote')} />
          <LabeledButton label="Inline button" icon={<MousePointerClick />} disabled={inLineOff} onClick={() => blocks.open('inline-button')} />
          <LabeledButton label="Inline image" icon={<ImagePlus />} disabled={inLineOff} onClick={() => blocks.open('inline-image')} />
        </Group>
        <Group label="Blocks" wraps>
          <BigButton label="Callout" icon={<Info />} pressed={state.block === 'callout'} disabled={off} onClick={() => block('callout')} hint="A tinted note with an icon" />
          <BigButton label="Divider" icon={<SeparatorHorizontal />} disabled={off || state.inTable} onClick={() => (editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined), editor.focus())} />
          <BigButton label="Code block" icon={<SquareCode />} pressed={state.block === 'code'} disabled={off} onClick={() => block('code')} />
          <BigButton label="Quote" icon={<Quote />} pressed={state.block === 'quote'} disabled={off} onClick={() => block('quote')} />
        </Group>
      </>
    ),
    format: (
      <>
        <Group label="Colors" className="grid grid-cols-2 gap-x-1 gap-y-0.5">
          <ColorTool labeled label="Text color" icon={<Baseline />} current={state.color} start="#dc2626" swatches={INK_SWATCHES} disabled={noText} onPick={(c, live) => t.style({ color: c }, !live)} />
          <ColorTool
            labeled
            label="Background color"
            icon={<PaintBucket />}
            current={state.background}
            swatches={TINT_SWATCHES}
            alpha
            start="#facc1559"
            disabled={noText}
            onPick={(c, live) => t.style({ 'background-color': c }, !live)}
          />
          <UnderlineTool labeled current={state.underlineColor} type={state.underlineStyle} disabled={noText} onPick={t.underlineColor} onType={t.setUnderlineType} onClear={t.clearUnderline} />
          <BorderTool labeled current={state.borderColor} type={state.borderStyle} width={state.borderWidth} start={BORDER_START} disabled={noText} onPick={t.borderColor} onType={t.setBorderType} onWidth={t.setBorderWidth} />
        </Group>
        <Group label="Layout" className="grid grid-cols-3 gap-0.5">
          {ALIGNMENTS.map((a) => (
            <ToolButton key={a.format} label={a.label} pressed={state.align === a.format} disabled={off} onClick={() => t.setAlign(a.format)}>
              {a.icon}
            </ToolButton>
          ))}
          <ToolButton label="Indent less" disabled={off} onClick={() => t.indent(-1)}>
            <IndentDecrease />
          </ToolButton>
          <ToolButton label="Indent more" disabled={off} onClick={() => t.indent(1)}>
            <IndentIncrease />
          </ToolButton>
        </Group>
        <Group label="Clean up">
          <BigButton label="Clear formatting" icon={<RemoveFormatting />} disabled={noText} onClick={() => t.change($clearFormatting)} hint="Marks, font, size, and colors" />
        </Group>
      </>
    ),
    table: (
      <>
        <Group label="Rows" className="flex-col items-start gap-0.5">
          <LabeledButton label="Insert above" icon={<ArrowUpToLine />} disabled={off} onClick={() => t.table(TABLE_ACTIONS[0].$run)} />
          <LabeledButton label="Insert below" icon={<ArrowDownToLine />} disabled={off} onClick={() => t.table(TABLE_ACTIONS[1].$run)} />
        </Group>
        <Group label="Columns" className="flex-col items-start gap-0.5">
          <LabeledButton label="Insert left" icon={<ArrowLeftToLine />} disabled={off} onClick={() => t.table(TABLE_ACTIONS[2].$run)} />
          <LabeledButton label="Insert right" icon={<ArrowRightToLine />} disabled={off} onClick={() => t.table(TABLE_ACTIONS[3].$run)} />
        </Group>
        <Group label="Cells" className="flex-col items-start gap-0.5">
          <LabeledButton label="Merge cells" icon={<Combine />} disabled={off} onClick={() => t.table(TABLE_ACTIONS[4].$run)} />
          <LabeledButton label="Split cell" icon={<SplitSquareHorizontal />} disabled={off} onClick={() => t.table(TABLE_ACTIONS[5].$run)} />
          <ColorTool labeled label="Cell color" icon={<PaintBucket />} current={state.cellBackground} swatches={TINT_SWATCHES} alpha start="#facc1559" disabled={off} onPick={(c, live) => t.setCellBackground(c, !live)} />
        </Group>
        <Group label="Headers">
          <BigButton label="Header row" icon={<PanelTop />} pressed={state.headerRow} disabled={off} onClick={() => t.table($toggleHeaderRow)} hint="The first row as column headings" />
          <BigButton label="Header column" icon={<PanelLeft />} pressed={state.headerColumn} disabled={off} onClick={() => t.table($toggleHeaderColumn)} hint="The first column as row headings" />
        </Group>
        <Group label="Look" className="flex-col items-start gap-0.5">
          <LabeledButton label={state.striped ? 'No stripes' : 'Striped rows'} icon={<Rows3 />} disabled={off} onClick={() => t.table($toggleRowStriping)} />
          <LabeledButton label="Even columns" icon={<Columns3Cog />} disabled={off} onClick={() => t.table(TABLE_ACTIONS[8].$run)} />
        </Group>
        <Group label="Sort" className="flex-col items-start gap-0.5">
          <LabeledButton label="A to Z" icon={<ArrowDownAZ />} disabled={off} onClick={() => t.table(TABLE_ACTIONS[6].$run)} />
          <LabeledButton label="Z to A" icon={<ArrowDownZA />} disabled={off} onClick={() => t.table(TABLE_ACTIONS[7].$run)} />
        </Group>
        <Group label="Delete" className="flex-col items-start gap-0.5">
          {TABLE_ACTIONS.filter((a) => a.danger).map((a) => (
            <LabeledButton key={a.label} danger label={a.label} icon={<Trash2 />} disabled={off} onClick={() => t.table(a.$run)} />
          ))}
        </Group>
      </>
    ),
    callout: (
      <>
        <Group label="Kind" wraps>
          {CALLOUT_TONE_LIST.map((tone) => (
            <BigButton key={tone} label={CALLOUT_TONES[tone].label} icon={<CalloutIcon tone={tone} />} pressed={state.callout === tone} disabled={off} onClick={() => t.setCalloutTone(tone)} />
          ))}
        </Group>
        <Group label="Undo it">
          <BigButton label="Paragraph" icon={<Pilcrow />} disabled={off} onClick={() => block('callout')} hint="Turn the callout back into plain text" />
        </Group>
      </>
    ),
    columns: (
      <>
        <Group label="Layout" wraps>
          {COLUMN_LAYOUT_LIST.map((layout) => (
            <BigButton
              key={layout}
              label={COLUMN_LAYOUTS[layout].label}
              icon={COLUMN_LAYOUTS[layout].count === 3 ? <Columns3 /> : <Columns2 />}
              pressed={state.columns === layout}
              disabled={off}
              onClick={() => t.columns(layout)}
              hint={COLUMN_LAYOUTS[layout].hint}
            />
          ))}
        </Group>
        <Group label="Undo it">
          <BigButton label="Remove columns" icon={<Pilcrow />} disabled={off} onClick={() => t.columns('remove')} hint="Put their writing back in the page, one after another" />
        </Group>
      </>
    ),
    faq: (
      <>
        <Group label="Questions">
          <BigButton label="Add a question" icon={<Plus />} disabled={off} onClick={() => t.faq('add')} hint="After this one (or Enter on an empty last line of an answer)" />
        </Group>
        <Group label="Delete" className="flex-col items-start gap-0.5">
          <LabeledButton danger label="Remove this question" icon={<Trash2 />} disabled={off} onClick={() => t.faq('remove')} />
          <LabeledButton danger label="Delete FAQ" icon={<Trash2 />} disabled={off} onClick={() => t.faq('delete')} />
        </Group>
      </>
    ),
  }
  const groups = Children.toArray(panels[shown].props.children)
  const { rows, hidden } = useRibbonFit(panelRef, open ? shown : 'closed', groups.length)

  return (
    <div ref={ribbonRef} className="relative border-b border-line bg-fill/60">
      <div className="flex items-center gap-2 px-2 pt-1">
        <div role="tablist" aria-label="Ribbon" onKeyDown={onTabKeyDown} className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto scrollbar-none">
          {tabs.map((x) => {
            const on = x.id === shown
            return (
              <button
                key={x.id}
                id={`${id}-${x.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={open ? `${id}-panel` : undefined}
                // Roving: only the open tab is in the Tab order
                tabIndex={on ? 0 : -1}
                onClick={() => (collapsed && on && peek ? setPeek(false) : pick(x.id))}
                onDoubleClick={() => {
                  setCollapsed(!collapsed)
                  setPeek(false)
                }}
                className={cn(
                  '-mb-px shrink-0 cursor-pointer rounded-t-md border-b-2 px-3 py-1.5 text-[0.82rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                  on && open ? 'border-brand bg-surface text-brand' : 'border-transparent text-ink-soft hover:text-ink',
                  x.contextual && 'text-brand'
                )}
              >
                {x.label}
                {x.contextual ? <span className="sr-only"> (for {x.contextual} you&apos;re in)</span> : null}
              </button>
            )
          })}
        </div>
        {/* Undo and redo, always in reach, with the editor's own views */}
        <div role="toolbar" aria-label="History" className="flex items-center gap-0.5">
          {ui.commenting ? (
            <ToolButton label={state.textSelected ? 'Comment on the selected words' : 'Comment (select some words first)'} disabled={off || !state.textSelected} onClick={ui.startComment}>
              <MessageSquarePlus />
            </ToolButton>
          ) : null}
          <ToolButton label={`Find and replace (${t.mod}F)`} disabled={off} onClick={ui.openFind}>
            <Search />
          </ToolButton>
          <ToolButton label={ui.fullscreen ? 'Leave full screen (Esc)' : 'Full screen'} pressed={ui.fullscreen} disabled={off} onClick={ui.toggleFullscreen}>
            {ui.fullscreen ? <Minimize2 /> : <Maximize2 />}
          </ToolButton>
          <ToolButton label={`Keyboard shortcuts (${t.mod}/)`} onClick={ui.openShortcuts}>
            <Keyboard />
          </ToolButton>
          <ToolButton label={`Undo (${t.mod}Z)`} disabled={off || !t.canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
            <Undo2 />
          </ToolButton>
          <ToolButton label={`Redo (${t.mod}${t.mod === '⌘' ? '⇧Z' : 'Y'})`} disabled={off || !t.canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
            <Redo2 />
          </ToolButton>
          <ToolButton
            label={collapsed ? 'Pin the ribbon open' : 'Collapse the ribbon'}
            onClick={() => {
              setCollapsed(!collapsed)
              setPeek(false)
            }}
          >
            {collapsed ? <Pin /> : <ChevronUp />}
          </ToolButton>
        </div>
      </div>
      {open ? (
        <div
          id={`${id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-${shown}`}
          className={cn(
            'border-t border-line bg-surface',
            // Peeking: over the text, not pushing it down
            peek && 'absolute inset-x-0 top-full z-20 rounded-b-lg border-b shadow-[0_12px_24px_rgb(0_0_0/0.12)]'
          )}
        >
          <div
            ref={panelRef}
            role="toolbar"
            aria-label={`${tabs.find((x) => x.id === shown)?.label} tools`}
            onKeyDown={onToolKeyDown}
            className="flex items-stretch overflow-x-auto py-1.5 scrollbar-thin"
          >
            <RowsContext.Provider value={rows}>
              {hidden ? groups.slice(0, -hidden) : groups}
              {hidden ? <Overflow groups={groups.slice(-hidden)} /> : null}
            </RowsContext.Provider>
          </div>
        </div>
      ) : null}
      {collapsed && !peek ? (
        <span aria-hidden className="pointer-events-none absolute right-2 bottom-0.5 text-ink-faint">
          <ChevronDown size={12} />
        </span>
      ) : null}
    </div>
  )
}
