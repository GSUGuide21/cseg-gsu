'use client'

import { $isCodeNode } from '@lexical/code-core'
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/extension'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { LexicalTypeaheadMenuPlugin, MenuOption, useBasicTypeaheadTriggerMatch, type TriggerFn } from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { INSERT_TABLE_COMMAND } from '@lexical/table'
import { $findMatchingParent } from '@lexical/utils'
import { $getSelection, $isRangeSelection } from 'lexical'
import {
  Asterisk,
  AtSign,
  Bookmark,
  CalendarClock,
  CalendarDays,
  ChartNoAxesColumn,
  Clapperboard,
  Clock,
  Footprints,
  ImageIcon,
  ImagePlus,
  LayoutGrid,
  MapPinned,
  MessageCircleQuestion,
  MessageSquareQuote,
  MousePointerClick,
  RectangleHorizontal,
  SeparatorHorizontal,
  Table,
  Tag,
  Trophy,
  Gem,
} from 'lucide-react'
import { useCallback, useMemo, useState, type FC, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/cn'

import { $replacingEmptyLine } from './commands'
import { $faqAtSelection, useBlockDialogs, type InsertableBlock } from './nodes'
import { $setBlockType, BLOCKS } from './tools'

/** One thing the menu can do. `$run` goes in the same update that takes the typed "/…" out. */
class SlashOption extends MenuOption {
  constructor(
    readonly label: string,
    readonly glyph: ReactNode,
    readonly $run: () => void,
    readonly hint = '',
    /** Other words it's found by */
    readonly keywords = ''
  ) {
    super(label)
  }
}

const KEYWORDS: Record<string, string> = { h1: 'title', h2: 'subtitle', bullet: 'ul unordered', number: 'ol ordered', check: 'todo task', paragraph: 'text normal', callout: 'note warning', quote: 'blockquote' }

const DIALOG_BLOCKS: { block: InsertableBlock; label: string; icon: ReactNode; hint: string; keywords?: string }[] = [
  { block: 'image', label: 'Image', icon: <ImageIcon />, hint: 'Upload one, or use its address', keywords: 'photo picture' },
  { block: 'buttons', label: 'Buttons', icon: <RectangleHorizontal />, hint: 'Links styled as buttons', keywords: 'cta' },
  { block: 'video', label: 'Video', icon: <Clapperboard />, hint: 'From a YouTube or Vimeo link', keywords: 'embed' },
  { block: 'steps', label: 'Steps', icon: <Footprints />, hint: 'Numbered steps, side by side', keywords: 'how to' },
  { block: 'ranking', label: 'Ranking', icon: <Trophy />, hint: 'A numbered top list', keywords: 'best top' },
  { block: 'cards', label: 'Cards', icon: <LayoutGrid />, hint: 'One card, or a grid of them', keywords: 'grid' },
  { block: 'reference', label: 'References', icon: <Bookmark />, hint: 'Things already on the site', keywords: 'link page post' },
  { block: 'stats', label: 'Stats', icon: <ChartNoAxesColumn />, hint: 'Big numbers in a row', keywords: 'numbers figures' },
  { block: 'schedule', label: 'Schedule', icon: <CalendarClock />, hint: 'A day’s plan', keywords: 'agenda timeline' },
  { block: 'testimonial', label: 'Testimonial', icon: <MessageSquareQuote />, hint: 'A quote with who said it', keywords: 'review' },
  { block: 'events', label: 'Upcoming events', icon: <CalendarDays />, hint: 'The next CSEG events from PIN', keywords: 'calendar live' },
  { block: 'core-values', label: 'Core values', icon: <Gem />, hint: 'The six that spell CAMPUS', keywords: 'mission about campus live' },
  { block: 'place', label: 'Map place', icon: <MapPinned />, hint: 'A small campus map', keywords: 'location pin' },
  { block: 'chip', label: 'Chip', icon: <AtSign />, hint: 'In the line: a place, event, or page, linked', keywords: 'inline mention reference' },
  { block: 'datetime', label: 'Date or time', icon: <Clock />, hint: 'In the line', keywords: 'inline calendar when' },
  { block: 'badge', label: 'Badge', icon: <Tag />, hint: 'In the line: a short colored label', keywords: 'inline label status' },
  { block: 'footnote', label: 'Footnote', icon: <Asterisk />, hint: 'A numbered note at the end', keywords: 'inline reference citation' },
  { block: 'inline-button', label: 'Inline button', icon: <MousePointerClick />, hint: 'In the line', keywords: 'cta link' },
  { block: 'inline-image', label: 'Inline image', icon: <ImagePlus />, hint: 'In the line: a logo or icon', keywords: 'icon logo emoji picture' },
]

/**
 * Typing "/" at the start of a word opens every block the editor has, narrowed by what's
 * typed after it: the arrow keys and Enter to pick one, Escape to carry on writing. It's
 * Lexical's typeahead menu, so the writing area stays focused and screen readers follow
 * the highlighted option. Not in code blocks, which are plain text, or FAQ questions.
 */
export const SlashMenu: FC = () => {
  const [editor] = useLexicalComposerContext()
  const dialogs = useBlockDialogs()
  const [query, setQuery] = useState<string | null>(null)
  const slash = useBasicTypeaheadTriggerMatch('/', { minLength: 0 })

  const trigger: TriggerFn = useCallback(
    (text, e) => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection) || $findMatchingParent(selection.anchor.getNode(), $isCodeNode) || $faqAtSelection()?.inQuestion) return null
      return slash(text, e)
    },
    [slash]
  )

  const all = useMemo(
    () => [
      ...BLOCKS.map((b) => new SlashOption(b.label, b.icon, () => $setBlockType(editor, b.type), '', KEYWORDS[b.type])),
      new SlashOption('Divider', <SeparatorHorizontal />, () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined), '', 'rule line hr'),
      new SlashOption(
        'Table',
        <Table />,
        () => $replacingEmptyLine(() => editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: '3', columns: '3', includeHeaders: { rows: true, columns: false } })),
        '3 × 3, with a header row'
      ),
      new SlashOption('FAQ', <MessageCircleQuestion />, dialogs.insertFaq, 'Questions that open to their answers', 'questions'),
      ...DIALOG_BLOCKS.map((b) => new SlashOption(b.label, b.icon, () => dialogs.open(b.block), b.hint, b.keywords)),
    ],
    [editor, dialogs]
  )

  const options = useMemo(() => {
    const q = query?.trim().toLowerCase()
    return q ? all.filter((o) => `${o.label} ${o.keywords}`.toLowerCase().includes(q)) : all
  }, [all, query])

  return (
    <LexicalTypeaheadMenuPlugin<SlashOption>
      triggerFn={trigger}
      options={options}
      onQueryChange={setQuery}
      anchorClassName="z-50"
      onSelectOption={(option, textNode, closeMenu) => {
        editor.update(() => {
          textNode?.remove()
          option.$run()
          closeMenu()
        })
      }}
      menuRenderFn={(anchor, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) =>
        anchor.current && options.length
          ? createPortal(
              <div className="mt-1 max-h-72 w-72 overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-[0_12px_24px_rgb(0_0_0/0.12)]">
                {options.map((option, i) => (
                  <div
                    key={option.key}
                    id={`typeahead-item-${i}`}
                    ref={option.setRefElement}
                    role="option"
                    aria-selected={selectedIndex === i}
                    tabIndex={-1}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    // The cursor stays in the text, so the block lands where "/" was typed
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectOptionAndCleanUp(option)}
                    className={cn('flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[0.85rem] font-semibold text-ink [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-ink-soft', selectedIndex === i && 'bg-brand-tint')}
                  >
                    {option.glyph}
                    <span className="flex min-w-0 flex-col">
                      {option.label}
                      {option.hint ? <span className="truncate text-[0.75rem] font-normal text-muted">{option.hint}</span> : null}
                    </span>
                  </div>
                ))}
              </div>,
              anchor.current
            )
          : null
      }
    />
  )
}
