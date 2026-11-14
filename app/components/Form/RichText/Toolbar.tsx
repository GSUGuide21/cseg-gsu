'use client'

import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/extension'
import { FORMAT_TEXT_COMMAND, REDO_COMMAND, UNDO_COMMAND } from 'lexical'
import {
  Asterisk,
  AtSign,
  Baseline,
  Bookmark,
  AppWindow,
  MessageSquarePlus,
  Keyboard,
  Maximize2,
  Minimize2,
  Search,
  Clapperboard,
  Columns2,
  Images,
  Paperclip,
  Clock,
  AlignLeft,
  Footprints,
  ImageIcon,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  LayoutGrid,
  MessageCircleQuestion,
  Minus,
  MoreHorizontal,
  MousePointerClick,
  PaintBucket,
  Plus,
  RectangleHorizontal,
  Redo2,
  SeparatorHorizontal,
  Tag,
  Trophy,
  Undo2,
  CalendarDays,
  ChartNoAxesColumn,
  CalendarClock as ScheduleIcon,
  MapPinned,
  MessageSquareQuote,
  Gem,
} from 'lucide-react'
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type FC, type ReactNode } from 'react'

import { CALLOUT_TONE_LIST, CALLOUT_TONES, COLUMN_LAYOUT_LIST, COLUMN_LAYOUTS, LINE_HEIGHT_LIST, LINE_HEIGHTS } from '@/lib/richtext/blocks'

import { ActionMenu } from '../../ActionMenu'
import { Popover } from '../../Popover'
import { BorderTool, ColorTool, INK_SWATCHES, TINT_SWATCHES, UnderlineTool } from './ColorTool'
import { ToolCombobox } from './Combobox'
import { TABLE_ACTIONS } from './commands'
import { CalloutIcon, useBlockDialogs } from './nodes'
import { ALIGNMENTS, BLOCKS, BORDER_START, Divider, FORMATS, LinkTool, MenuButton, TableInsert, ToolButton, isApple, useEditorTools, useRovingFocus } from './tools'
import { SymbolTool } from './Symbols'
import type { FontOption } from './types'
import { useEditorUI } from './ui'

interface ToolGroup {
  key: string
  node: ReactNode
}

/** Gap between toolbar groups (gap-0.5), and the More button's width */
const GROUP_GAP = 2
const MORE_WIDTH = 32

/** The groups that don't fit in the row, behind a ⋯ button */
const Overflow: FC<{ groups: ToolGroup[] }> = ({ groups }) => {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      aria-label="More formatting"
      align="end"
      // Above the site's header, like the color panels that open from it
      className="z-60"
      trigger={
        <button
          type="button"
          data-tool
          aria-label="More formatting"
          className="ml-auto grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand aria-expanded:bg-fill aria-expanded:text-ink [&>svg]:size-4"
        >
          <MoreHorizontal />
        </button>
      }
    >
      <div className="flex max-w-[min(20rem,calc(100vw-2rem))] flex-col gap-1.5">
        {groups.map((g) => (
          <div key={g.key} className="flex flex-wrap items-center gap-0.5">
            {g.node}
          </div>
        ))}
      </div>
    </Popover>
  )
}

/**
 * The editor's toolbar: undo and redo, the block (paragraph, headings, quote, lists,
 * callout, code), font and size, text marks (bold through highlight and code), colors (text,
 * background, underline, border), and inserting an image, buttons, a table, or a divider,
 * with row and column tools while the cursor's in a table and tones while it's in a callout.
 *
 * The WAI-ARIA toolbar pattern: one Tab stop, then the arrow keys (and Home/End) move
 * between its controls. It's one row: groups that don't fit (from the end) move behind a ⋯
 * button, and come back as the editor gets wider.
 */
export const Toolbar: FC<{ fonts: FontOption[]; sizes: number[]; disabled: boolean }> = ({ fonts, sizes, disabled }) => {
  const ui = useEditorUI()
  const { setLink, editor, state, canUndo, canRedo, mod, setBlock, setAlign, indent, setCalloutTone, faq, columns, setLineHeight, setCellBackground, style, underlineColor, setUnderlineType, clearUnderline, borderColor, setBorderType, setBorderWidth, currentSize, stepSize, table, insertTable, blockInfo, fontLabel, commitFont, commitSize, off, noText } = useEditorTools({ fonts, sizes, disabled })
  const blocks = useBlockDialogs()
  const barRef = useRef<HTMLDivElement>(null)
  const onKeyDown = useRovingFocus(barRef)

  /** The toolbar's controls in order; when the row's too narrow, groups go behind ⋯ from the end */
  const groups: ToolGroup[] = [
    {
      key: 'history',
      node: (
        <>
          <ToolButton label={`Undo (${mod}Z)`} disabled={off || !canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>
            <Undo2 />
          </ToolButton>
          <ToolButton label={`Redo (${mod}${isApple() ? '⇧Z' : 'Y'})`} disabled={off || !canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>
            <Redo2 />
          </ToolButton>
        </>
      ),
    },
    {
      key: 'block',
      node: (
        <>
          <ActionMenu
            label="Block type"
            align="start"
            trigger={<MenuButton label={`Block type: ${blockInfo.label}`} display={<>{blockInfo.icon}<span className="hidden sm:inline">{blockInfo.label}</span></>} disabled={off || state.faq === 'question'} />}
            items={BLOCKS.map((b) => ({ label: b.label, icon: b.icon, description: b.type === state.block ? 'Current' : undefined, onSelect: () => setBlock(b.type) }))}
          />
          {state.callout ? (
            <ActionMenu
              label="Callout kind"
              align="start"
              trigger={<MenuButton label={`Callout kind: ${CALLOUT_TONES[state.callout].label}`} display={<CalloutIcon tone={state.callout} />} disabled={off} />}
              items={CALLOUT_TONE_LIST.map((tone) => ({
                label: CALLOUT_TONES[tone].label,
                icon: <CalloutIcon tone={tone} />,
                description: tone === state.callout ? 'Current' : undefined,
                onSelect: () => setCalloutTone(tone),
              }))}
            />
          ) : null}
          {state.faq ? (
            <ActionMenu
              label="FAQ"
              align="start"
              trigger={<MenuButton label="FAQ tools" display="FAQ" disabled={off} />}
              items={[
                { label: 'Add a question', description: 'After this one', onSelect: () => faq('add') },
                'separator',
                { label: 'Remove this question', danger: true, onSelect: () => faq('remove') },
                { label: 'Delete FAQ', danger: true, onSelect: () => faq('delete') },
              ]}
            />
          ) : null}
          {state.columns ? (
            <ActionMenu
              label="Columns"
              align="start"
              trigger={<MenuButton label="Columns tools" display="Columns" disabled={off} />}
              items={[
                ...COLUMN_LAYOUT_LIST.map((layout) => ({
                  label: COLUMN_LAYOUTS[layout].label,
                  description: layout === state.columns ? 'Current' : COLUMN_LAYOUTS[layout].hint,
                  onSelect: () => columns(layout),
                })),
                'separator' as const,
                { label: 'Remove the columns', description: 'Their writing stays, one after another', danger: true, onSelect: () => columns('remove') },
              ]}
            />
          ) : null}
        </>
      ),
    },
    {
      key: 'font',
      node: (
        <>
          <ToolCombobox
            label="Font"
            display={fontLabel}
            filter
            disabled={noText}
            className="w-32"
            // Each font shown in itself
            options={fonts.map((f) => ({ label: f.label, value: f.value, style: f.value ? { fontFamily: f.value } : undefined }))}
            onCommit={(text, option) => commitFont(text, option)}
          />
        </>
      ),
    },
    {
      key: 'size',
      node: (
        <>
          <span className="flex items-center">
            <ToolButton label="Smaller text" disabled={noText || currentSize <= sizes[0]} onClick={() => stepSize(-1)}>
              <Minus />
            </ToolButton>
            <ToolCombobox
              label="Text size, in points"
              display={String(currentSize)}
              inputMode="numeric"
              disabled={noText}
              className="w-16"
              options={[...sizes.map((s) => ({ label: String(s), value: String(s) })), { label: 'Default', value: '' }]}
              onCommit={(text, option) => commitSize(option ? option.value : text)}
            />
            <ToolButton label="Larger text" disabled={noText || currentSize >= sizes[sizes.length - 1]} onClick={() => stepSize(1)}>
              <Plus />
            </ToolButton>
          </span>
        </>
      ),
    },
    {
      key: 'marks',
      node: (
        <>
          {FORMATS.map((f) => (
            <ToolButton
              key={f.format}
              label={f.keys ? `${f.label} (${mod}${f.keys})` : f.label}
              pressed={state.formats.has(f.format)}
              disabled={noText}
              onClick={() => {
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, f.format)
                editor.focus()
              }}
            >
              {f.icon}
            </ToolButton>
          ))}
          <LinkTool current={state.link} disabled={noText} onLink={setLink} />
          <SymbolTool disabled={noText} />
        </>
      ),
    },
    {
      key: 'layout',
      node: (
        <ActionMenu
          label="Alignment and indent"
          align="start"
          trigger={<MenuButton label="Alignment and indent" display={ALIGNMENTS.find((a) => a.format === state.align)?.icon ?? <AlignLeft />} disabled={off} />}
          items={[
            ...ALIGNMENTS.map((a) => ({ label: a.label, icon: a.icon, description: a.format === state.align ? 'Current' : undefined, onSelect: () => setAlign(a.format) })),
            'separator' as const,
            { label: 'Indent less', icon: <IndentDecrease />, onSelect: () => indent(-1) },
            { label: 'Indent more', icon: <IndentIncrease />, onSelect: () => indent(1) },
            'separator' as const,
            {
              label: 'Line spacing',
              items: [
                { label: 'Usual', description: state.lineHeight === '' ? 'Current' : undefined, onSelect: () => setLineHeight('') },
                ...LINE_HEIGHT_LIST.map((v) => ({ label: LINE_HEIGHTS[v], description: v === state.lineHeight ? 'Current' : undefined, onSelect: () => setLineHeight(v) })),
              ],
            },
          ]}
        />
      ),
    },
    {
      key: 'colors',
      node: (
        <>
          <ColorTool label="Text color" icon={<Baseline />} current={state.color} start="#dc2626" swatches={INK_SWATCHES} disabled={noText} onPick={(c, live) => style({ color: c }, !live)} />
          <ColorTool
            label="Background color"
            icon={<PaintBucket />}
            current={state.background}
            swatches={TINT_SWATCHES}
            alpha
            start="#facc1559"
            disabled={noText}
            onPick={(c, live) => style({ 'background-color': c }, !live)}
          />
          <UnderlineTool current={state.underlineColor} type={state.underlineStyle} disabled={noText} onPick={underlineColor} onType={setUnderlineType} onClear={clearUnderline} />
          <BorderTool current={state.borderColor} type={state.borderStyle} width={state.borderWidth} start={BORDER_START} disabled={noText} onPick={borderColor} onType={setBorderType} onWidth={setBorderWidth} />
        </>
      ),
    },
    {
      key: 'insert',
      node: (
        <>
          <ActionMenu
            label="Insert a block"
            align="start"
            trigger={<MenuButton label="Insert a block" display={<Plus />} disabled={off || state.inCode} />}
            items={[
              { label: 'Image', icon: <ImageIcon />, onSelect: blocks.openImage },
              { label: 'Buttons', icon: <RectangleHorizontal />, onSelect: blocks.openButtons },
              { label: 'Video', icon: <Clapperboard />, onSelect: () => blocks.open('video') },
              { label: 'Photo gallery', icon: <Images />, onSelect: () => blocks.open('gallery') },
              { label: 'File', icon: <Paperclip />, onSelect: () => blocks.open('file') },
              { label: 'Embed', icon: <AppWindow />, onSelect: () => blocks.open('embed') },
              'separator',
              {
                label: 'Columns',
                icon: <Columns2 />,
                items: COLUMN_LAYOUT_LIST.map((layout) => ({ label: COLUMN_LAYOUTS[layout].label, description: COLUMN_LAYOUTS[layout].hint, disabled: !!state.columns || state.inTable || !!state.faq, onSelect: () => blocks.insertColumns(layout) })),
              },
              { label: 'FAQ', icon: <MessageCircleQuestion />, disabled: !!state.faq, onSelect: blocks.insertFaq },
              { label: 'Steps', icon: <Footprints />, onSelect: () => blocks.open('steps') },
              { label: 'Ranking', icon: <Trophy />, onSelect: () => blocks.open('ranking') },
              { label: 'Cards', icon: <LayoutGrid />, onSelect: () => blocks.open('cards') },
              { label: 'References', icon: <Bookmark />, onSelect: () => blocks.open('reference') },
              { label: 'Stats', icon: <ChartNoAxesColumn />, onSelect: () => blocks.open('stats') },
              { label: 'Schedule', icon: <ScheduleIcon />, onSelect: () => blocks.open('schedule') },
              { label: 'Testimonial', icon: <MessageSquareQuote />, onSelect: () => blocks.open('testimonial') },
              'separator',
              { label: 'Upcoming events', icon: <CalendarDays />, onSelect: () => blocks.open('events') },
              { label: 'Core values', icon: <Gem />, onSelect: () => blocks.open('core-values') },
              { label: 'Map place', icon: <MapPinned />, onSelect: () => blocks.open('place') },
              {
                label: 'In the line',
                items: [
                  { label: 'Chip', icon: <AtSign />, onSelect: () => blocks.open('chip') },
                  { label: 'Date or time', icon: <Clock />, onSelect: () => blocks.open('datetime') },
                  { label: 'Badge', icon: <Tag />, onSelect: () => blocks.open('badge') },
                  { label: 'Footnote', icon: <Asterisk />, onSelect: () => blocks.open('footnote') },
                  { label: 'Inline button', icon: <MousePointerClick />, onSelect: () => blocks.open('inline-button') },
                  { label: 'Inline image', icon: <ImagePlus />, onSelect: () => blocks.open('inline-image') },
                ].map((item) => ({ ...item, disabled: state.faq === 'question' })),
              },
            ]}
          />
          <TableInsert
            disabled={off || state.inTable || state.inCode}
            onInsert={insertTable}
          />
          {state.inTable ? (
            <ActionMenu
              label="Table"
              align="start"
              trigger={<MenuButton label="Table tools" display="Table" disabled={off} />}
              items={TABLE_ACTIONS.flatMap((a, i) => [
                // A line before the first of the deletes
                ...(a.danger && !TABLE_ACTIONS[i - 1]?.danger ? ['separator' as const] : []),
                { label: a.label, danger: a.danger, onSelect: () => table(a.$run) },
              ])}
            />
          ) : null}
          {state.inTable ? (
            <ColorTool label="Cell color" icon={<PaintBucket />} current={state.cellBackground} swatches={TINT_SWATCHES} alpha start="#facc1559" disabled={off} onPick={(c, live) => setCellBackground(c, !live)} />
          ) : null}
          <ToolButton label="Insert a divider" disabled={off || state.inTable} onClick={() => (editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined), editor.focus())}>
            <SeparatorHorizontal />
          </ToolButton>
        </>
      ),
    },
    {
      key: 'view',
      node: (
        <>
          {ui.commenting ? (
            <ToolButton label={state.textSelected ? 'Comment on the selected words' : 'Comment (select some words first)'} disabled={off || !state.textSelected} onClick={ui.startComment}>
              <MessageSquarePlus />
            </ToolButton>
          ) : null}
          <ToolButton label={`Find and replace (${mod}F)`} disabled={off} onClick={ui.openFind}>
            <Search />
          </ToolButton>
          <ToolButton label={ui.fullscreen ? 'Leave full screen (Esc)' : 'Full screen'} pressed={ui.fullscreen} disabled={off} onClick={ui.toggleFullscreen}>
            {ui.fullscreen ? <Minimize2 /> : <Maximize2 />}
          </ToolButton>
          <ToolButton label={`Keyboard shortcuts (${mod}/)`} onClick={ui.openShortcuts}>
            <Keyboard />
          </ToolButton>
        </>
      ),
    },
  ]

  // How many groups fit: each one's width is noted while it's in the row (a hidden one keeps
  // its last width), and the count is worked out again after each render and resize
  const [fit, setFit] = useState(groups.length)
  const widths = useRef(new Map<string, number>())
  const [, setResized] = useState(0)
  useEffect(() => {
    const bar = barRef.current
    if (!bar || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setResized((n) => n + 1))
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])
  // After every render on purpose: a group's width changes with what's selected ("Paragraph" vs
  // "Bulleted list"). It only sets state when the count changes, so it settles at once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const bar = barRef.current
    if (!bar) return
    for (const el of bar.querySelectorAll<HTMLElement>(':scope > [data-group]')) widths.current.set(el.dataset.group!, el.offsetWidth)
    const style = getComputedStyle(bar)
    const room = bar.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    // Dividers sit between groups: a 1px line with 4px either side, plus the gaps
    const DIVIDER = 9 + GROUP_GAP
    const sized = groups.map((g, i) => (widths.current.get(g.key) ?? 0) + (i ? DIVIDER : 0) + GROUP_GAP)
    const total = sized.reduce((a, w) => a + w, 0)
    let n = groups.length
    if (total > room) {
      n = 0
      let used = MORE_WIDTH
      for (const w of sized) {
        if (used + w > room) break
        used += w
        n++
      }
    }
    if (n !== fit) setFit(n)
  })

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="Formatting"
      onKeyDown={onKeyDown}
      className="flex min-w-0 flex-nowrap items-center gap-0.5 border-b border-line bg-fill/60 px-1.5 py-1"
    >
      {groups.slice(0, fit).map((g, i) => (
        <Fragment key={g.key}>
          {i > 0 ? <Divider /> : null}
          <div data-group={g.key} className="flex shrink-0 items-center gap-0.5">
            {g.node}
          </div>
        </Fragment>
      ))}
      {fit < groups.length ? <Overflow groups={groups.slice(fit)} /> : null}
    </div>
  )
}
