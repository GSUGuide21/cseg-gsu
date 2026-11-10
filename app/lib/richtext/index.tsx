import Link from 'next/link'
import { useId, type CSSProperties, type FC, type ReactNode } from 'react'

import { richTextTheme } from '@/components/Form/RichText/theme'
import { cn } from '@/lib/cn'
import { EventsBlock, PlaceBlock } from '@/globals/LiveBlocks'
import { CoreValues } from '@/globals/Page/CoreValues'
import { CORE_VALUES } from '@/globals/config/club'
import { ReferenceGrid } from '@/globals/References'
import { getPlace } from '@/lib/data/places'
import { parseReferences } from '@/lib/references'
import { InlineChip } from '@/globals/InlineChip'
import { PageBlock } from '@/globals/Page'
import { Markdown } from '@/lib/markdown'
import { safeHref } from '@/lib/safeUrl'

import {
  ButtonRow,
  Callout,
  CardGrid,
  FaqItem,
  FaqList,
  faqClasses,
  sectionId,
  Figure,
  inlinePlain,
  parseAlign,
  parseAlt,
  parseButtons,
  parseCaption,
  parseCards,
  legacyEateriesItem,
  parseFaq,
  parseSrc,
  parseSteps,
  parseTone,
  parseVideo,
  StepList,
  Video,
  RankingList,
  parseRankings,
  rankingText,
  dateTimeText,
  footnoteMark,
  InlineBadge,
  InlineButton,
  InlineDateTime,
  InlineImage,
  InlineText,
  parseBadgeLabel,
  parseBadgeTone,
  parseChipKind,
  parseChipLabel,
  parseChipTarget,
  parseDate,
  parseDateStyle,
  parseFootnote,
  parseInlineAlt,
  parseInlineButtonStyle,
  parseInlineHref,
  parseInlineLabel,
  parseInlineSrc,
  parseTime,
  parseEventCount,
  parsePlaceId,
  parsePlaceNote,
  parseScheduleItems,
  parseStats,
  parseTestimonials,
  parseWhenNone,
  ScheduleList,
  scheduleText,
  StatRow,
  statText,
  TestimonialList,
  testimonialText,
} from './blocks'
import { parsePortableText, portableTextRoot } from './portableText'

/**
 * Posts and pages written in the rich text editor, shown on the site. It reads the saved
 * Lexical JSON (or the same content as Portable Text) and makes each element itself, so
 * nothing in it runs: links go only where safeHref allows, and text styles are limited to
 * the ones the editor sets (colors, font, size, border), each value checked. An unknown
 * kind of node shows just its text.
 */

interface SerializedNode {
  type: string
  children?: SerializedNode[]
  text?: string
  format?: number | string
  style?: string
  indent?: number
  tag?: string
  listType?: string
  start?: number
  checked?: boolean
  url?: string
  headerState?: number
  /** A callout's */
  tone?: string
  /** A button row's */
  buttons?: unknown
  align?: string
  /** An image's */
  src?: string
  alt?: string
  caption?: string
  /** An FAQ's questions, steps, or cards */
  items?: unknown
  /** A video's */
  provider?: string
  id?: string
  title?: string
  /** An old Eateries block's */
  area?: string
  kind?: string
  /** An Upcoming events block's */
  count?: unknown
  whenNone?: unknown
  /** A Map place block's */
  placeId?: unknown
  note?: unknown
  /** An inline button's */
  label?: unknown
  href?: unknown
  buttonStyle?: unknown
  /** A date or time's */
  date?: unknown
  time?: unknown
  dateStyle?: unknown
  /** A chip's */
  target?: unknown
  /** A footnote's place in the document, and the ids it links by, from withFootnotes */
  number?: number
  anchor?: string
}

/** Lexical's text format bits */
const BOLD = 1
const ITALIC = 2
const STRIKE = 4
const UNDERLINE = 8
const CODE = 16
const SUB = 32
const SUPER = 64
const HIGHLIGHT = 128

/** The text styles the editor sets, and nothing else */
const ALLOWED_STYLES = new Set(['color', 'background-color', 'font-family', 'font-size', 'text-decoration-color', 'text-decoration-style', 'border-color', 'border-style', 'border-width', 'border-radius', 'padding'])
const SAFE_VALUE = /^[#\w\s.,%()'"/+-]{1,120}$/

/** "color: red; font-size: 18px" → { color: 'red', fontSize: '18px' }, keeping only what's allowed */
export const safeStyle = (css: string | undefined): CSSProperties | undefined => {
  if (!css) return undefined
  const out: Record<string, string> = {}
  for (const part of css.split(';')) {
    const at = part.indexOf(':')
    if (at < 0) continue
    const prop = part.slice(0, at).trim().toLowerCase()
    const value = part.slice(at + 1).trim()
    if (!ALLOWED_STYLES.has(prop) || !SAFE_VALUE.test(value) || /url\(|expression|\\/i.test(value)) continue
    out[prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = value
  }
  return Object.keys(out).length ? (out as CSSProperties) : undefined
}

/** A paragraph's or heading's alignment */
const ALIGN: Record<string, string> = { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify', start: 'text-start', end: 'text-end' }

const text = (n: SerializedNode, key: string): ReactNode => {
  const f = typeof n.format === 'number' ? n.format : 0
  let el: ReactNode = n.text ?? ''
  const t = richTextTheme.text ?? {}
  // An underline or strikethrough takes its color and type from the element that draws it
  const { textDecorationColor, textDecorationStyle, ...style } = safeStyle(n.style) ?? {}
  const line = textDecorationColor || textDecorationStyle ? { textDecorationColor, textDecorationStyle } : undefined
  if (f & CODE) el = <code className={t.code as string}>{el}</code>
  if (f & BOLD) el = <strong className={t.bold as string}>{el}</strong>
  if (f & ITALIC) el = <em className={t.italic as string}>{el}</em>
  if (f & UNDERLINE && f & STRIKE) el = <span className={t.underlineStrikethrough as string} style={line}>{el}</span>
  else if (f & UNDERLINE) el = <span className={t.underline as string} style={line}>{el}</span>
  else if (f & STRIKE) el = <s className={t.strikethrough as string} style={line}>{el}</s>
  if (f & SUB) el = <sub>{el}</sub>
  if (f & SUPER) el = <sup>{el}</sup>
  if (f & HIGHLIGHT) el = <mark className={cn('text-inherit', t.highlight as string)}>{el}</mark>
  return (
    <span key={key} style={Object.keys(style).length ? style : undefined}>
      {el}
    </span>
  )
}

const kids = (n: SerializedNode, key: string) => (n.children ?? []).map((c, i) => node(c, `${key}.${i}`))

/** A paragraph's or heading's alignment class */
const alignOf = (n: SerializedNode) => (typeof n.format === 'string' ? ALIGN[n.format] : undefined)

/** A block's indent, by Lexical's step of 40px, as the editor draws it */
const indentOf = (n: SerializedNode): CSSProperties | undefined => (typeof n.indent === 'number' && n.indent > 0 ? { paddingInlineStart: `${Math.min(n.indent, 10) * 40}px` } : undefined)

/** A list item: a nested list's has no bullet, and a checklist's says aloud whether it's done */
const isNestedItem = (n: SerializedNode) => n.children?.length === 1 && n.children[0].type === 'list'

const listItem = (n: SerializedNode, key: string, check: boolean, value?: number) => {
  const list = richTextTheme.list as Record<string, string> & { nested: { listitem: string } }
  const nested = isNestedItem(n)
  return (
    <li key={key} value={value} className={cn(list.listitem, nested ? list.nested.listitem : check && (n.checked ? list.listitemChecked : list.listitemUnchecked), alignOf(n))}>
      {check && !nested ? <span className="sr-only">{n.checked ? 'Done: ' : 'Not done: '}</span> : null}
      {kids(n, key)}
    </li>
  )
}

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
const HEADINGS: readonly string[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

type NodeRenderer = (n: SerializedNode, key: string) => ReactNode

/** How each kind of node is drawn: a renderer, or the name of a kind drawn the same way */
const WORDS_PER_MINUTE = 220

export type RichTextNodeType = Record<string, NodeRenderer | string>

const NODE_TYPES: RichTextNodeType = {
  text,
  'code-highlight': 'text',
  linebreak: (_, key) => <br key={key} />,
  tab: (_, key) => <span key={key}>{'\t'}</span>,
  paragraph: (n, key) => (
    <p key={key} className={cn(richTextTheme.paragraph, alignOf(n))} style={indentOf(n)}>
      {kids(n, key)}
    </p>
  ),
  heading: (n, key) => {
    const H = (HEADINGS.includes(n.tag ?? '') ? n.tag : 'h3') as HeadingTag
    return (
      <H key={key} id={H === 'h2' ? sectionId(nodeText(n)) || undefined : undefined} className={cn((richTextTheme.heading as Record<string, string>)[H], alignOf(n))} style={indentOf(n)}>
        {kids(n, key)}
      </H>
    )
  },
  quote: (n, key) => (
    <blockquote key={key} className={cn(richTextTheme.quote, alignOf(n))} style={indentOf(n)}>
      {kids(n, key)}
    </blockquote>
  ),
  list: (n, key) => {
    const ordered = n.listType === 'number'
    const check = n.listType === 'check'
    const L = ordered ? 'ol' : 'ul'
    const list = richTextTheme.list as Record<string, string>
    // The item holding a nested list still counts as one in an <ol>, so the items after it say their number
    let count = typeof n.start === 'number' ? n.start : 1
    return (
      <L key={key} start={ordered && n.start && n.start !== 1 ? n.start : undefined} className={ordered ? list.ol : check ? list.checklist : list.ul}>
        {(n.children ?? []).map((c, i) =>
          c.type === 'listitem' ? listItem(c, `${key}.${i}`, check, ordered && !isNestedItem(c) ? count++ : undefined) : node(c, `${key}.${i}`)
        )}
      </L>
    )
  },
  listitem: (n, key) => listItem(n, key, false),
  code: (n, key) => (
    <pre key={key} className={richTextTheme.code}>
      <code>{kids(n, key)}</code>
    </pre>
  ),
  link: (n, key) => {
    const href = n.url ? safeHref(n.url) : null
    if (!href) return <span key={key}>{kids(n, key)}</span>
    return href.startsWith('/') ? (
      <Link key={key} href={href} className={richTextTheme.link}>
        {kids(n, key)}
      </Link>
    ) : (
      // Only web links open in a new tab; mailto: and tel: hand off to the app for them
      <a key={key} href={href} className={richTextTheme.link} {...(/^https?:/.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {kids(n, key)}
      </a>
    )
  },
  autolink: 'link',
  horizontalrule: (_, key) => <hr key={key} className={richTextTheme.hr} />,
  callout: (n, key) => (
    <Callout key={key} tone={parseTone(n.tone)}>
      {kids(n, key)}
    </Callout>
  ),
  buttons: (n, key) => {
    const buttons = parseButtons(n.buttons)
    return buttons.length ? <ButtonRow key={key} buttons={buttons} align={parseAlign(n.align)} /> : null
  },
  image: (n, key) => {
    const src = parseSrc(n.src)
    return src ? <Figure key={key} src={src} alt={parseAlt(n.alt)} caption={parseCaption(n.caption)} /> : null
  },
  faq: (n, key) => {
    // Saved as data, before FAQs were typed in place
    if (n.items !== undefined) {
      const items = parseFaq(n.items)
      return items.length ? <FaqList key={key} items={items} group={`faq-${key}`} /> : null
    }
    return n.children?.length ? (
      <div key={key} className={faqClasses.list}>
        {kids(n, key)}
      </div>
    ) : null
  },
  'faq-item': (n, key) => {
    const question = n.children?.find((c) => c.type === 'faq-question')
    const answer = n.children?.find((c) => c.type === 'faq-answer')
    if (!question) return null
    // One answer open at a time within an FAQ: its questions share a name, from the FAQ's key
    return (
      <FaqItem key={key} group={`faq-${key.slice(0, key.lastIndexOf('.'))}`} question={kids(question, `${key}.q`)}>
        {answer ? kids(answer, `${key}.a`) : null}
      </FaqItem>
    )
  },
  // Drawn by their item; on their own (which the editor doesn't make), just what's in them
  'faq-question': 'default',
  'faq-answer': 'default',
  steps: (n, key) => {
    const items = parseSteps(n.items)
    return items.length ? <StepList key={key} items={items} /> : null
  },
  cards: (n, key) => {
    const items = parseCards(n.items)
    return items.length ? <CardGrid key={key} items={items} /> : null
  },
  video: (n, key) => {
    const video = parseVideo(n)
    return video?.provider ? <Video key={key} video={{ ...video, provider: video.provider }} /> : null
  },
  // Live from what the page provides (SiteContentProvider), so hours, pins, and titles stay current
  reference: (n, key) => {
    const items = parseReferences(n.items)
    return items.length ? <ReferenceGrid key={key} items={items} /> : null
  },
  // An Eateries block from before they were references, until the editor upgrades it
  eateries: (n, key) => {
    const item = legacyEateriesItem(n.area, n.kind)
    return item ? <ReferenceGrid key={key} items={[item]} /> : null
  },
  table: (n, key) => (
    <div key={key} className="my-3 overflow-x-auto">
      <table className={richTextTheme.table}>
        <tbody>{kids(n, key)}</tbody>
      </table>
    </div>
  ),
  tablerow: (n, key) => <tr key={key}>{kids(n, key)}</tr>,
  tablecell: (n, key) => {
    // headerState: 1 is a header row, 2 a header column
    const header = !!n.headerState
    const C = header ? 'th' : 'td'
    return (
      <C key={key} scope={n.headerState === 1 ? 'col' : n.headerState === 2 ? 'row' : undefined} className={cn(richTextTheme.tableCell, header && richTextTheme.tableCellHeader)}>
        {kids(n, key)}
      </C>
    )
  },
  tablecaption: (n, key) => <caption key={key}>{kids(n, key)}</caption>,
  ranking: (n, key) => {
    const items = parseRankings(n.items)
    return items.length ? <RankingList key={key} items={items} /> : null
  },
  stats: (n, key) => {
    const items = parseStats(n.items)
    return items.length ? <StatRow key={key} items={items} /> : null
  },
  schedule: (n, key) => {
    const items = parseScheduleItems(n.items)
    return items.length ? <ScheduleList key={key} items={items} /> : null
  },
  testimonial: (n, key) => {
    const items = parseTestimonials(n.items)
    return items.length ? <TestimonialList key={key} items={items} /> : null
  },
  'inline-button': (n, key) => {
    const label = parseInlineLabel(n.label)
    const href = parseInlineHref(n.href)
    return label && href ? <InlineButton key={key} label={label} href={href} buttonStyle={parseInlineButtonStyle(n.buttonStyle)} /> : null
  },
  'inline-image': (n, key) => {
    const src = parseInlineSrc(n.src)
    return src ? <InlineImage key={key} src={src} alt={parseInlineAlt(n.alt)} /> : null
  },
  badge: (n, key) => {
    const label = parseBadgeLabel(n.label)
    return label ? <InlineBadge key={key} label={label} tone={parseBadgeTone(n.tone)} /> : null
  },
  datetime: (n, key) => {
    const date = parseDate(n.date)
    return date ? <InlineDateTime key={key} date={date} time={parseTime(n.time)} dateStyle={parseDateStyle(n.dateStyle)} /> : null
  },
  footnote: (n, key) =>
    n.number ? (
      <sup key={key} id={`${n.anchor}-ref-${n.number}`} className="scroll-mt-24">
        <a href={`#${n.anchor}-note-${n.number}`} aria-label={`Footnote ${n.number}`} className={footnoteMark}>
          {n.number}
        </a>
      </sup>
    ) : null,
  // Live, like the blocks below, but with its name from when it was picked for when it's gone
  chip: (n, key) => <InlineChip key={key} kind={parseChipKind(n.kind)} target={parseChipTarget(n.target)} label={parseChipLabel(n.label)} />,
  // Live from what the page provides (SiteContentProvider): the next events, and the place as the map has it now
  events: (n, key) => <EventsBlock key={key} count={parseEventCount(n.count)} whenNone={parseWhenNone(n.whenNone)} />,
  // The values from the site's own list, as the About page draws them
  'core-values': (_, key) => <CoreValues key={key} />,
  place: (n, key) => {
    const placeId = parsePlaceId(n.placeId)
    return placeId ? <PlaceBlock key={key} placeId={placeId} note={parsePlaceNote(n.note)} /> : null
  },
  // Something newer than this renderer: its words, at least
  default: (n, key) => (n.children ? <span key={key}>{kids(n, key)}</span> : n.text ? <span key={key}>{n.text}</span> : null),
}

/** The renderer for a kind of node, following a name to the kind it's drawn like */
const rendererFor = (type: string): NodeRenderer => {
  const entry = NODE_TYPES[type] ?? NODE_TYPES.default
  const resolved = typeof entry === 'string' ? NODE_TYPES[entry] : entry
  return typeof resolved === 'function' ? resolved : (NODE_TYPES.default as NodeRenderer)
}

function node(n: SerializedNode, key: string): ReactNode {
  const render = rendererFor(n.type)
  return render(n, key)
}

/** The saved editor state, or null when it isn't one (markdown from before the editor) */
export const parseRichText = (source: string): SerializedNode | null => {
  const s = source.trim()
  const portable = parsePortableText(s)
  if (portable) return portableTextRoot(portable) as unknown as SerializedNode
  if (!s.startsWith('{')) return null
  try {
    const json = JSON.parse(s) as { root?: SerializedNode }
    return json.root?.type === 'root' ? json.root : null
  } catch {
    return null
  }
}

/** How one kind of node turns into words */
export type NodeParser = (n: SerializedNode) => string

/**
 * Kinds whose children are separate lines: a document's blocks, a list's items, an FAQ's
 * entries, a table's rows. Everything else (a paragraph's words, a cell's) runs together.
 */
const LINE_PER_CHILD = new Set(['root', 'list', 'tablerow', 'table', 'faq', 'faq-item', 'faq-answer'])

/** A node's children's words, a line each where the kind calls for it */
const childrenText: NodeParser = (n) => (n.children ?? []).map(nodeText).join(LINE_PER_CHILD.has(n.type) ? '\n' : '')

/**
 * The kinds whose words aren't just their children's. An image's caption is part of what's
 * written, as are a list block's words; button labels aren't (nor are References: what they
 * point at is written elsewhere).
 */
const PLAIN_TEXT: Record<string, NodeParser> = {
  text: (n) => n.text ?? '',
  'code-highlight': (n) => n.text ?? '',
  linebreak: () => '\n',
  image: (n) => parseCaption(n.caption),
  // Saved as data, before FAQs were typed in place; typed-in ones are their children
  faq: (n) =>
    n.items !== undefined
      ? parseFaq(n.items)
          .map((f) => `${f.q}\n${inlinePlain(f.a)}`)
          .join('\n')
      : childrenText(n),
  steps: (n) =>
    parseSteps(n.items)
      .map((s) => `${s.title}\n${inlinePlain(s.text)}`)
      .join('\n'),
  cards: (n) =>
    parseCards(n.items)
      .map((c) => `${c.title}\n${inlinePlain(c.text)}`)
      .join('\n'),
  ranking: (n) =>
    parseRankings(n.items)
      .map(rankingText)
      .join('\n'),
  stats: (n) => parseStats(n.items).map(statText).join('\n'),
  schedule: (n) => parseScheduleItems(n.items).map(scheduleText).join('\n'),
  testimonial: (n) => parseTestimonials(n.items).map(testimonialText).join('\n'),
  'core-values': () => CORE_VALUES.map((v) => `${v.title}: ${v.body}`).join('\n'),
  place: (n) => [getPlace(parsePlaceId(n.placeId))?.name, inlinePlain(parsePlaceNote(n.note))].filter(Boolean).join('\n'),
  // These sit in a sentence, so their words run on in it; a footnote's are read at the end of the page
  'inline-button': (n) => parseInlineLabel(n.label),
  badge: (n) => parseBadgeLabel(n.label),
  chip: (n) => parseChipLabel(n.label),
  datetime: (n) => dateTimeText({ date: parseDate(n.date), time: parseTime(n.time), dateStyle: parseDateStyle(n.dateStyle) }),
}

function nodeText(n: SerializedNode): string {
  return (PLAIN_TEXT[n.type] ?? childrenText)(n)
}

/** How long something takes to read, in minutes, for "3 min read" */
export const readingMinutes = (text: string) => Math.max(1, Math.round((text.trim() ? text.trim().split(/\s+/).length : 0) / WORDS_PER_MINUTE))

/** A document's main headings, with the #link each gets when it's shown, for an "On this page" list */
export const documentHeadings = (source: string) => {
  const seen = new Set<string>()
  return (parseRichText(source)?.children ?? []).flatMap((n) => {
    const text = n.type === 'heading' && n.tag === 'h2' ? nodeText(n).trim() : ''
    const id = sectionId(text)
    if (!id || seen.has(id)) return []
    seen.add(id)
    return [{ id, text }]
  })
}

/** Just the words, for a word count or a summary */
export const plainText = (source: string): string => {
  const root = parseRichText(source)
  if (!root) return source
  return nodeText(root)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** The document with each footnote numbered in reading order, and their notes in that order */
const withFootnotes = (root: SerializedNode, anchor: string) => {
  const notes: string[] = []
  const walk = (n: SerializedNode): SerializedNode => {
    if (n.type === 'footnote') {
      const note = parseFootnote(n.note)
      if (note) notes.push(note)
      return note ? { ...n, number: notes.length, anchor } : n
    }
    return n.children ? { ...n, children: n.children.map(walk) } : n
  }
  return { numbered: walk(root), notes }
}

export const RichContent: FC<{ root: SerializedNode; className?: string }> = ({ root, className }) => {
  // Its own ids, so two pieces of writing on a page (a page's sections) can't link into each other
  const anchor = useId()
  const { numbered, notes } = withFootnotes(root, anchor)
  return (
    <div className={cn('text-[1rem] text-ink-soft [&>*:first-child]:mt-0', className)}>
      {kids(numbered, 'r')}
      {notes.length ? (
        <ol aria-label="Footnotes" className="mt-8 list-decimal border-t border-line pt-4 pl-6 text-[0.88rem] text-muted">
          {notes.map((note, i) => (
            <li key={i} id={`${anchor}-note-${i + 1}`} className="my-1 scroll-mt-24">
              <InlineText text={note} />{' '}
              <a href={`#${anchor}-ref-${i + 1}`} aria-label={`Back to footnote ${i + 1} in the text`} className={footnoteMark}>
                ↩
              </a>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}

/** A post's or page's body, whichever way it was written: the rich text editor, or markdown */
export const DocumentBody: FC<{ source: string; className?: string }> = ({ source, className }) => {
  const root = parseRichText(source)
  return root ? <RichContent root={root} className={className} /> : <Markdown source={source} className={className} />
}

/** One of a page's sections, as saved: its own title, subtitle, #link, and writing */
export interface PageSectionContent {
  title: string
  subtitle: string
  /** Its #link; "" or missing makes one from the title */
  anchor?: string
  body: string
}

/**
 * A page laid out in sections, each drawn as the site's own pages draw theirs (PageBlock:
 * the title with the brand bar, the subtitle under it, then its writing), with a #link: its
 * own, or one from its title (made unique when two match).
 */
/** Each section's #link, in order: its own, or one from its title, made unique when two match */
export const sectionIds = (sections: readonly Pick<PageSectionContent, 'title' | 'anchor'>[]): string[] => {
  const used = new Map<string, number>()
  return sections.map(({ title, anchor }) => {
    const base = sectionId(anchor || title) || 'section'
    const n = (used.get(base) ?? 0) + 1
    used.set(base, n)
    return n > 1 ? `${base}-${n}` : base
  })
}

export const PageSections: FC<{ sections: readonly PageSectionContent[]; className?: string }> = ({ sections, className }) => {
  const ids = sectionIds(sections)
  return (
    <div className={cn('flex flex-col gap-[clamp(3rem,6vw,4.5rem)]', className)}>
      {sections.map((s, i) => (
        <PageBlock key={i} id={ids[i]} title={s.title || 'Untitled section'} description={s.subtitle || undefined}>
          {s.body.trim() ? <DocumentBody source={s.body} className="max-w-3xl" /> : null}
        </PageBlock>
      ))}
    </div>
  )
}
