import type { EditorThemeClasses } from 'lexical'

import type { FontOption } from './types'

/** The classes Lexical puts on what it renders: the site's type scale and colors */
export const richTextTheme: EditorThemeClasses = {
  paragraph: 'my-2 leading-[1.7]',
  heading: {
    h1: 'mt-5 mb-2 text-[1.8rem] leading-tight font-extrabold text-ink first:mt-0',
    h2: 'mt-4 mb-2 text-[1.4rem] leading-snug font-bold text-ink first:mt-0',
    h3: 'mt-3 mb-1.5 text-[1.15rem] leading-snug font-bold text-ink first:mt-0',
    h4: 'mt-3 mb-1 text-[1rem] leading-snug font-bold text-ink first:mt-0',
    h5: 'mt-2 mb-1 text-[0.88rem] leading-snug font-bold text-ink first:mt-0',
    h6: 'mt-2 mb-1 text-[0.8rem] leading-snug font-bold text-ink first:mt-0',
  },
  quote: 'my-3 border-l-4 border-brand-edge pl-4 text-ink-soft italic',
  list: {
    ul: 'my-2 list-disc pl-6',
    ol: 'my-2 list-decimal pl-6',
    checklist: 'my-2 list-none pl-0',
    listitem: 'my-0.5 leading-[1.7]',
    // Lexical takes a click on ::before as a click on the box, so the box has to be there
    // The arrow keys can land on an item, for Space to tick it
    listitemUnchecked:
      'relative list-none rounded-sm pl-7 outline-none focus-visible:outline-2 focus-visible:outline-brand before:absolute before:top-[0.3em] before:left-0 before:size-[1.1em] before:rounded before:border-2 before:border-line before:bg-surface',
    listitemChecked:
      "relative list-none rounded-sm pl-7 text-muted line-through outline-none focus-visible:outline-2 focus-visible:outline-brand before:absolute before:top-[0.3em] before:left-0 before:size-[1.1em] before:rounded before:border-2 before:border-brand before:bg-brand after:absolute after:top-[0.42em] after:left-[0.38em] after:h-[0.62em] after:w-[0.34em] after:rotate-45 after:border-r-2 after:border-b-2 after:border-white after:content-['']",
    // A nested list's own item, with no bullet (or box) of its own
    nested: { listitem: 'list-none pl-0! before:hidden after:hidden' },
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline underline-offset-2',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through underline-offset-2',
    code: 'rounded bg-fill px-1.5 py-0.5 font-mono text-[0.88em]',
    // Lexical's "highlight" is a <mark>
    highlight: 'rounded-sm bg-series-4/35 px-0.5 text-inherit',
  },
  code: 'my-3 block overflow-x-auto rounded-lg border border-line bg-fill p-3 font-mono text-[0.85rem] leading-relaxed whitespace-pre',
  table: 'w-full table-fixed border-collapse',
  // Wide tables scroll sideways in this, rather than stretching the editor (hasHorizontalScroll)
  tableScrollableWrapper: 'my-3 overflow-x-auto',
  tableRow: '',
  tableCell: 'relative min-w-20 border border-line px-2.5 py-1.5 text-left align-top',
  tableCellHeader: 'bg-fill font-semibold',
  tableCellSelected: 'bg-brand-tint',
  // Words with a comment on them, and with more than one
  mark: 'rounded-xs border-b-2 border-warning/70 bg-warning/15 text-inherit',
  markOverlap: 'bg-warning/30',
  // Every other body row shaded (a header row keeps its own fill)
  tableRowStriping: '[&_tr:nth-child(even)>td]:bg-fill/70',
  tableSelection: 'selection:bg-transparent',
  hr: 'my-5 border-0 border-t-2 border-line [&.selected]:border-brand',
  link: 'text-brand underline underline-offset-2',
}

export const DEFAULT_FONTS: FontOption[] = [
  { label: 'Default', value: '' },
  // The site's own, which every page already loads
  { label: 'Montserrat', value: 'var(--font-montserrat), system-ui, sans-serif' },
  { label: 'Yellowtail', value: 'var(--font-yellowtail), cursive' },
  // On readers' own devices, so each costs nothing to load and falls back to its nearest kin
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Verdana, sans-serif' },
  { label: 'Trebuchet', value: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Garamond', value: 'Garamond, Baskerville, "Times New Roman", serif' },
  { label: 'Palatino', value: '"Palatino Linotype", Palatino, "Book Antiqua", serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
  { label: 'Monospace', value: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
]

/** In points, as a word processor's */
export const DEFAULT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72]
