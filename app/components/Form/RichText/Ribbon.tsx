'use client'

import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/extension'
import { FORMAT_TEXT_COMMAND, REDO_COMMAND, UNDO_COMMAND } from 'lexical'
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Baseline,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  ClipboardPaste,
  ClipboardType,
  Copy,
  Footprints,
  ImageIcon,
  Info,
  LayoutGrid,
  List,
  ListOrdered,
  MessageCircleQuestion,
  Minus,
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
  Square,
  Trash2,
  Underline,
  Undo2,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type FC, type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { CALLOUT_TONE_LIST, CALLOUT_TONES } from '@/lib/richtext/blocks'

import { Tooltip } from '../../Tooltip'
import { ColorTool, INK_SWATCHES, TINT_SWATCHES } from './ColorTool'
import { ToolCombobox } from './Combobox'
import { $clearFormatting, $toggleHeaderRow, TABLE_ACTIONS } from './commands'
import { CalloutIcon, useBlockDialogs } from './nodes'
import { FORMATS, LinkTool, TableInsert, ToolButton, bigTool, useClipboard, useEditorTools, useRovingFocus } from './tools'
import type { BlockType, FontOption } from './types'

type RibbonTab = 'home' | 'insert' | 'format' | 'table' | 'callout' | 'faq'

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

/** A labeled set of controls in a ribbon panel, its name underneath as in a word processor */
const Group: FC<{ label: string; children: ReactNode; className?: string }> = ({ label, children, className }) => (
  <div role="group" aria-label={label} className="flex shrink-0 flex-col items-stretch justify-stretch gap-1 border-r border-line px-2 last:border-r-0">
    <div className={cn('flex min-h-[3.75rem] items-center gap-1', className)}>{children}</div>
    <span aria-hidden className="text-center text-[0.68rem] font-semibold tracking-wide text-muted">
      {label}
    </span>
  </div>
)

/** The heading styles, each shown as itself */
const STYLES: { type: BlockType; label: string; preview: string }[] = [
  { type: 'paragraph', label: 'Normal', preview: 'text-[0.85rem]' },
  { type: 'h1', label: 'Heading 1', preview: 'text-[1rem] font-extrabold' },
  { type: 'h2', label: 'Heading 2', preview: 'text-[0.92rem] font-bold' },
  { type: 'h3', label: 'Heading 3', preview: 'text-[0.85rem] font-bold' },
]

/**
 * The ribbon: the editor's tools on tabs, in labeled groups, like a word processor's.
 * Home (clipboard, font, paragraph, styles), Insert, Format (colors), and a Table tab that
 * appears while the cursor's in a table. Undo and redo stay at the right of the tabs.
 *
 * Collapse it to just the tabs (the arrow at the right, or double-click a tab): a tab then
 * opens its panel over the text until a tool is used or focus moves on.
 *
 * The tabs are WAI-ARIA tabs (arrow keys between them); each panel is a toolbar, one Tab
 * stop with the arrow keys between its controls.
 */
export const Ribbon: FC<{ fonts: FontOption[]; sizes: number[]; disabled: boolean }> = ({ fonts, sizes, disabled }) => {
  const t = useEditorTools({ fonts, sizes, disabled })
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
  const shown: RibbonTab = (tab === 'table' && !state.inTable) || (tab === 'callout' && !state.callout) || (tab === 'faq' && !state.faq) ? 'home' : tab
  const tabs: { id: RibbonTab; label: string; contextual?: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'insert', label: 'Insert' },
    { id: 'format', label: 'Format' },
    ...(state.inTable ? [{ id: 'table' as const, label: 'Table', contextual: 'the table' }] : []),
    ...(state.callout ? [{ id: 'callout' as const, label: 'Callout', contextual: 'the callout' }] : []),
    ...(state.faq ? [{ id: 'faq' as const, label: 'FAQ', contextual: 'the FAQ' }] : []),
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

  const panels: Record<RibbonTab, ReactNode> = {
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
              label="Text size, in pixels"
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
            <ToolButton label="Clear formatting" disabled={noText} onClick={() => t.change($clearFormatting)}>
              <RemoveFormatting />
            </ToolButton>
          </div>
        </Group>
        <Group label="Paragraph">
          <BigButton label="Bullets" icon={<List />} pressed={state.block === 'bullet'} disabled={off} onClick={() => block('bullet')} />
          <BigButton label="Numbers" icon={<ListOrdered />} pressed={state.block === 'number'} disabled={off} onClick={() => block('number')} />
          <BigButton label="Quote" icon={<Quote />} pressed={state.block === 'quote'} disabled={off} onClick={() => block('quote')} />
        </Group>
        <Group label="Styles">
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
                'flex h-[3.75rem] w-[4.25rem] shrink-0 cursor-pointer flex-col justify-between rounded-lg border border-line bg-surface px-1.5 py-1.5 text-left transition-colors',
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
        <Group label="Media">
          <BigButton label="Image" icon={<ImageIcon />} disabled={off || state.inCode} onClick={blocks.openImage} hint="Upload one, or use its address" />
          <BigButton label="Buttons" icon={<RectangleHorizontal />} disabled={off || state.inCode} onClick={blocks.openButtons} hint="Links styled as buttons, for the next step" />
          <BigButton label="Video" icon={<Clapperboard />} disabled={off || state.inCode} onClick={() => blocks.open('video')} hint="From a YouTube or Vimeo link" />
        </Group>
        <Group label="Layout">
          <BigButton label="FAQ" icon={<MessageCircleQuestion />} disabled={off || state.inCode || !!state.faq} onClick={blocks.insertFaq} hint="Questions that open to their answers, typed in place" />
          <BigButton label="Steps" icon={<Footprints />} disabled={off || state.inCode} onClick={() => blocks.open('steps')} hint="Numbered steps, side by side" />
          <BigButton label="Cards" icon={<LayoutGrid />} disabled={off || state.inCode} onClick={() => blocks.open('cards')} hint="One card, or a grid of them" />
          <BigButton label="References" icon={<Bookmark />} disabled={off || state.inCode} onClick={() => blocks.open('reference')} hint="Cards for things already on the site, kept up to date" />
        </Group>
        <Group label="Blocks">
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
          <ColorTool labeled label="Underline color" icon={<Underline />} current={state.underlineColor} start="#0039a6" swatches={INK_SWATCHES} disabled={noText} onPick={t.underlineColor} />
          <ColorTool labeled label="Border color" icon={<Square />} current={state.borderColor} start="#0039a6" swatches={INK_SWATCHES} disabled={noText} onPick={t.borderColor} />
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
        <Group label="Headers">
          <BigButton label="Header row" icon={<PanelTop />} pressed={state.headerRow} disabled={off} onClick={() => t.table($toggleHeaderRow)} hint="The first row as column headings" />
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
        <Group label="Kind">
          {CALLOUT_TONE_LIST.map((tone) => (
            <BigButton key={tone} label={CALLOUT_TONES[tone].label} icon={<CalloutIcon tone={tone} />} pressed={state.callout === tone} disabled={off} onClick={() => t.setCalloutTone(tone)} />
          ))}
        </Group>
        <Group label="Undo it">
          <BigButton label="Paragraph" icon={<Pilcrow />} disabled={off} onClick={() => block('callout')} hint="Turn the callout back into plain text" />
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

  return (
    <div ref={ribbonRef} className="relative border-b border-line bg-fill/60">
      <div className="flex items-center gap-2 px-2 pt-1">
        <div role="tablist" aria-label="Ribbon" onKeyDown={onTabKeyDown} className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none]">
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
        {/* Undo and redo, always in reach */}
        <div role="toolbar" aria-label="History" className="flex items-center gap-0.5">
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
            className="flex items-stretch overflow-x-auto py-1.5 h-full [scrollbar-width:thin]"
          >
            {panels[shown]}
          </div>
        </div>
      ) : null}
      {collapsed && !peek ? (
        <span aria-hidden className="pointer-events-none absolute right-2 bottom-0.5 text-ink-faint">
          <ChevronDown size={12} />
        </span>
      ) : null}
      {blocks.dialogs}
    </div>
  )
}
