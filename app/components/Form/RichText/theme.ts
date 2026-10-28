import type { EditorThemeClasses } from 'lexical'

import type { FontOption } from './types'

/** The classes Lexical puts on what it renders: the site's type scale and colors */
export const richTextTheme: EditorThemeClasses = {
  paragraph: 'my-2 leading-[1.7]',
  heading: {
    h1: 'mt-5 mb-2 text-[1.8rem] leading-tight font-extrabold text-ink first:mt-0',
    h2: 'mt-4 mb-2 text-[1.4rem] leading-snug font-bold text-ink first:mt-0',
    h3: 'mt-3 mb-1.5 text-[1.15rem] leading-snug font-bold text-ink first:mt-0',
  },
  quote: 'my-3 border-l-4 border-brand-edge pl-4 text-ink-soft italic',
  list: {
    ul: 'my-2 list-disc pl-6',
    ol: 'my-2 list-decimal pl-6',
    listitem: 'my-0.5 leading-[1.7]',
    // A nested list's own item, with no bullet of its own
    nested: { listitem: 'list-none' },
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
  tableSelection: 'selection:bg-transparent',
  hr: 'my-5 border-0 border-t-2 border-line [&.selected]:border-brand',
  link: 'text-brand underline underline-offset-2',
}

export const DEFAULT_FONTS: FontOption[] = [
  { label: 'Default', value: '' },
  { label: 'Montserrat', value: 'var(--font-montserrat), system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Monospace', value: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
]

export const DEFAULT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40]
