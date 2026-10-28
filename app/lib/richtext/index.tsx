import Link from 'next/link'
import type { CSSProperties, FC, ReactNode } from 'react'

import { richTextTheme } from '@/components/Form/RichText/theme'
import { cn } from '@/lib/cn'
import { ReferenceGrid } from '@/globals/References'
import { parseReferences } from '@/lib/references'
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
} from './blocks'

/**
 * Posts and pages written in the rich text editor, shown on the site. It reads the saved
 * Lexical JSON and makes each element itself, so nothing in it runs: links go only where
 * safeHref allows, and text styles are limited to the ones the editor sets (colors, font,
 * size, border), each value checked. An unknown kind of node shows just its text.
 */

interface SerializedNode {
  type: string
  children?: SerializedNode[]
  text?: string
  format?: number | string
  style?: string
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
const ALLOWED_STYLES = new Set(['color', 'background-color', 'font-family', 'font-size', 'text-decoration-color', 'border-color', 'border-style', 'border-width', 'border-radius', 'padding'])
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
  if (f & CODE) el = <code className={t.code as string}>{el}</code>
  if (f & BOLD) el = <strong className={t.bold as string}>{el}</strong>
  if (f & ITALIC) el = <em className={t.italic as string}>{el}</em>
  if (f & UNDERLINE && f & STRIKE) el = <span className={t.underlineStrikethrough as string}>{el}</span>
  else if (f & UNDERLINE) el = <span className={t.underline as string}>{el}</span>
  else if (f & STRIKE) el = <s className={t.strikethrough as string}>{el}</s>
  if (f & SUB) el = <sub>{el}</sub>
  if (f & SUPER) el = <sup>{el}</sup>
  if (f & HIGHLIGHT) el = <mark className={cn('text-inherit', t.highlight as string)}>{el}</mark>
  const style = safeStyle(n.style)
  return style ? (
    <span key={key} style={style}>
      {el}
    </span>
  ) : (
    <span key={key}>{el}</span>
  )
}

const kids = (n: SerializedNode, key: string) => (n.children ?? []).map((c, i) => node(c, `${key}.${i}`))


/** A paragraph's or heading's alignment class */
const alignOf = (n: SerializedNode) => (typeof n.format === 'string' ? ALIGN[n.format] : undefined)

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
const HEADINGS: readonly string[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

type NodeRenderer = (n: SerializedNode, key: string) => ReactNode

/** How each kind of node is drawn: a renderer, or the name of a kind drawn the same way */
export type RichTextNodeType = Record<string, NodeRenderer | string>

const NODE_TYPES: RichTextNodeType = {
  text,
  'code-highlight': 'text',
  linebreak: (_, key) => <br key={key} />,
  tab: (_, key) => <span key={key}>{'\t'}</span>,
  paragraph: (n, key) => (
    <p key={key} className={cn(richTextTheme.paragraph, alignOf(n))}>
      {kids(n, key)}
    </p>
  ),
  heading: (n, key) => {
    const H = (HEADINGS.includes(n.tag ?? '') ? n.tag : 'h3') as HeadingTag
    return (
      <H key={key} className={cn((richTextTheme.heading as Record<string, string>)[H], alignOf(n))}>
        {kids(n, key)}
      </H>
    )
  },
  quote: (n, key) => (
    <blockquote key={key} className={richTextTheme.quote}>
      {kids(n, key)}
    </blockquote>
  ),
  list: (n, key) => {
    const ordered = n.listType === 'number'
    const L = ordered ? 'ol' : 'ul'
    const list = richTextTheme.list as Record<string, string>
    return (
      <L key={key} start={ordered && n.start && n.start !== 1 ? n.start : undefined} className={ordered ? list.ol : list.ul}>
        {kids(n, key)}
      </L>
    )
  },
  listitem: (n, key) => {
    // A nested list sits in an item of its own, with no bullet
    const nested = n.children?.length === 1 && n.children[0].type === 'list'
    return (
      <li key={key} className={cn((richTextTheme.list as Record<string, string>).listitem, nested && 'list-none')}>
        {kids(n, key)}
      </li>
    )
  },
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
  if (!s.startsWith('{')) return null
  try {
    const json = JSON.parse(s) as { root?: SerializedNode }
    return json.root?.type === 'root' ? json.root : null
  } catch {
    return null
  }
}

/** Just the words, for a word count or a summary */
export const plainText = (source: string): string => {
  const root = parseRichText(source)
  if (!root) return source
  const walk = (n: SerializedNode): string =>
    n.type === 'text' || n.type === 'code-highlight'
      ? (n.text ?? '')
      : n.type === 'linebreak'
        ? '\n'
        : // An image's caption is part of what's written, as are a list block's words; button labels aren't
          n.type === 'image'
          ? parseCaption(n.caption)
          : n.type === 'faq' && n.items !== undefined
            ? parseFaq(n.items)
                .map((f) => `${f.q}\n${inlinePlain(f.a)}`)
                .join('\n')
            : n.type === 'steps'
              ? parseSteps(n.items)
                  .map((s) => `${s.title}\n${inlinePlain(s.text)}`)
                  .join('\n')
              : n.type === 'cards'
                ? parseCards(n.items)
                    .map((c) => `${c.title}\n${inlinePlain(c.text)}`)
                    .join('\n')
                : (n.children ?? [])
                    .map(walk)
                    .join(
                      ['paragraph', 'heading', 'quote', 'callout', 'listitem', 'code', 'tablecell', 'faq-question'].includes(n.type)
                        ? ''
                        : ['root', 'list', 'tablerow', 'table', 'faq', 'faq-item', 'faq-answer'].includes(n.type)
                          ? '\n'
                          : ''
                    )
  return walk(root)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const RichContent: FC<{ root: SerializedNode; className?: string }> = ({ root, className }) => (
  <div className={cn('text-[1rem] text-ink-soft [&>*:first-child]:mt-0', className)}>{kids(root, 'r')}</div>
)

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
export const PageSections: FC<{ sections: readonly PageSectionContent[]; className?: string }> = ({ sections, className }) => {
  const used = new Map<string, number>()
  const idFor = (title: string, anchor?: string) => {
    const base = sectionId(anchor || title) || 'section'
    const n = (used.get(base) ?? 0) + 1
    used.set(base, n)
    return n > 1 ? `${base}-${n}` : base
  }
  return (
    <div className={cn('flex flex-col gap-[clamp(3rem,6vw,4.5rem)]', className)}>
      {sections.map((s, i) => (
        <PageBlock key={i} id={idFor(s.title, s.anchor)} title={s.title || 'Untitled section'} description={s.subtitle || undefined}>
          {s.body.trim() ? <DocumentBody source={s.body} className="max-w-3xl" /> : null}
        </PageBlock>
      ))}
    </div>
  )
}
