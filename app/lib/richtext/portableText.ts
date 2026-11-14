/**
 * The editor's content as Portable Text (portabletext.org): a flat array of blocks, each a
 * style, a list position, and spans with named marks, so other tools can read and write it.
 * Lexical's JSON is still what's saved; this is that same content in the open format, and
 * either way round it stays the same document.
 *
 * Text blocks and lists follow the spec. Everything else (a table, a callout, an image, any
 * of the site's own blocks) is an object named after its node, holding that node's fields.
 * Beyond the spec: `align`, `indent`, and `checked` on a block, a "check" list item, and a
 * `textStyle` mark for the colors, font, and size people pick.
 */

export interface PortableTextSpan {
  _type: 'span'
  _key: string
  text: string
  /** Decorators by name, and the `_key`s of the block's markDefs */
  marks: string[]
}

/** A block of the site's own, or anything else that isn't text; also an inline object in a block's children */
export interface PortableTextObject {
  _type: string
  _key: string
  [field: string]: unknown
}

export interface PortableTextBlock {
  _type: 'block'
  _key: string
  /** "normal", "h1"–"h6", or "blockquote" */
  style: string
  children: (PortableTextSpan | PortableTextObject)[]
  /** What the marks on its spans that aren't decorators point at: links and text styles */
  markDefs: PortableTextObject[]
  listItem?: 'bullet' | 'number' | 'check'
  /** How deep in the list, from 1 */
  level?: number
  checked?: boolean
  /** Where a numbered list starts, on its first item, when it isn't 1 */
  start?: number
  align?: string
  indent?: number
}

export type PortableTextContent = (PortableTextBlock | PortableTextObject)[]

/** A node as Lexical serializes it */
export interface LexicalJSON {
  type: string
  children?: LexicalJSON[]
  [field: string]: unknown
}

/** Portable Text's names for Lexical's text format bits */
const DECORATORS: readonly (readonly [string, number])[] = [
  ['strong', 1],
  ['em', 2],
  ['strike-through', 4],
  ['underline', 8],
  ['code', 16],
  ['sub', 32],
  ['sup', 64],
  ['highlight', 128],
]

const FORMAT_OF = new Map(DECORATORS)

const without = (fields: object, ...names: string[]) => Object.fromEntries(Object.entries(fields).filter(([name]) => !names.includes(name)))
const LIST_ITEMS = { bullet: 'bullet', number: 'number', check: 'check' } as const

/** A document's blocks, from the root of Lexical's JSON. Keys count up, so the same document always comes out the same. */
export const toPortableText = (root: LexicalJSON): PortableTextContent => {
  let count = 0
  const key = () => `k${(count++).toString(36)}`

  const span = (text: string, marks: string[]): PortableTextSpan => ({ _type: 'span', _key: key(), text, marks })

  const object = (n: LexicalJSON): PortableTextObject => ({ _type: n.type, _key: key(), ...without(n, 'type', 'version') })

  /** One text style is one mark, however many spans wear it */
  const styleMark = (style: string, markDefs: PortableTextObject[]) => {
    const def = markDefs.find((d) => d._type === 'textStyle' && d.style === style) ?? { _type: 'textStyle', _key: key(), style }
    if (!markDefs.includes(def)) markDefs.push(def)
    return def._key
  }

  const inline = (nodes: LexicalJSON[], marks: string[], markDefs: PortableTextObject[]): PortableTextBlock['children'] =>
    nodes.flatMap((n): PortableTextBlock['children'] => {
      if (n.type === 'text' || n.type === 'code-highlight') {
        const format = typeof n.format === 'number' ? n.format : 0
        const decorators = DECORATORS.filter(([, bit]) => format & bit).map(([name]) => name)
        const style = typeof n.style === 'string' && n.style ? [styleMark(n.style, markDefs)] : []
        return [span(typeof n.text === 'string' ? n.text : '', [...decorators, ...style, ...marks])]
      }
      if (n.type === 'linebreak') return [span('\n', marks)]
      if (n.type === 'tab') return [span('\t', marks)]
      // A comment's mark: comments stay with the site, so only the words go
      if (n.type === 'mark') return inline(n.children ?? [], marks, markDefs)
      if (n.type === 'link' || n.type === 'autolink') {
        const def = { _type: 'link', _key: key(), href: n.url }
        markDefs.push(def)
        return inline(n.children ?? [], [...marks, def._key], markDefs)
      }
      return [object(n)]
    })

  const textBlock = (n: LexicalJSON, style: string, list?: Partial<PortableTextBlock>): PortableTextBlock => {
    const markDefs: PortableTextObject[] = []
    const children = inline(n.children ?? [], [], markDefs)
    return {
      _type: 'block',
      _key: key(),
      style,
      children: children.length ? children : [span('', [])],
      markDefs,
      ...list,
      ...(typeof n.format === 'string' && n.format ? { align: n.format } : {}),
      // A list item's indent is its level
      ...(!list && typeof n.indent === 'number' && n.indent > 0 ? { indent: n.indent } : {}),
    }
  }

  /** A list and those inside it, flat: each item a block, with how deep it is */
  const listItems = (list: LexicalJSON, level: number): PortableTextBlock[] => {
    const listItem = LIST_ITEMS[list.listType as keyof typeof LIST_ITEMS] ?? 'bullet'
    return (list.children ?? []).flatMap((item, i) => {
      const nested = item.children?.length === 1 && item.children[0].type === 'list' ? item.children[0] : null
      if (nested) return listItems(nested, level + 1)
      return [
        textBlock(item, 'normal', {
          listItem,
          level,
          ...(listItem === 'check' ? { checked: item.checked === true } : {}),
          ...(i === 0 && listItem === 'number' && typeof list.start === 'number' && list.start !== 1 ? { start: list.start } : {}),
        }),
      ]
    })
  }

  return (root.children ?? []).flatMap((n): PortableTextContent => {
    if (n.type === 'paragraph') return [textBlock(n, 'normal')]
    if (n.type === 'heading') return [textBlock(n, typeof n.tag === 'string' ? n.tag : 'h3')]
    if (n.type === 'quote') return [textBlock(n, 'blockquote')]
    if (n.type === 'list') return listItems(n, 1)
    return [object(n)]
  })
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

const element = (fields: LexicalJSON): LexicalJSON => ({ version: 1, direction: null, format: '', indent: 0, children: [], ...fields })

const textNode = (text: string, format = 0, style = ''): LexicalJSON => ({ type: 'text', version: 1, detail: 0, format, mode: 'normal', style, text })

/**
 * A root for Lexical from Portable Text. `isKnown` says which kinds of object the reader can
 * draw: the editor stops on a node it has no class for, so anything else becomes a line
 * saying what's missing, rather than vanishing the next time it's saved.
 */
export const portableTextRoot = (content: readonly unknown[], isKnown: (type: string) => boolean = () => true): LexicalJSON => {
  const fromObject = (o: PortableTextObject): LexicalJSON =>
    isKnown(o._type) ? { ...without(o, '_type', '_key'), type: o._type, version: 1 } : element({ type: 'paragraph', textFormat: 0, textStyle: '', children: [textNode(`Unsupported block: ${o._type}`)] })

  const inlineNodes = (block: PortableTextBlock): LexicalJSON[] => {
    const defs = new Map((Array.isArray(block.markDefs) ? block.markDefs : []).filter(isObject).map((d) => [d._key, d]))
    const out: LexicalJSON[] = []
    // The link at the end of `out`, while spans in a row share one
    let linkKey = ''
    for (const child of Array.isArray(block.children) ? block.children : []) {
      if (!isObject(child)) continue
      if (child._type !== 'span') {
        linkKey = ''
        if (typeof child._type === 'string') out.push(fromObject(child as PortableTextObject))
        continue
      }
      let format = 0
      let style = ''
      let linkDef: Record<string, unknown> | null = null
      for (const mark of Array.isArray(child.marks) ? child.marks : []) {
        format |= FORMAT_OF.get(mark) ?? 0
        const def = defs.get(mark)
        if (def?._type === 'link') linkDef = def
        else if (def?._type === 'textStyle' && typeof def.style === 'string') style = def.style
      }
      const pieces = String(child.text ?? '')
        .split(/(\n|\t)/)
        .filter(Boolean)
        .map((t) => (t === '\n' ? { type: 'linebreak', version: 1 } : t === '\t' ? { type: 'tab', version: 1, detail: 2, format: 0, mode: 'normal', style: '', text: '\t' } : textNode(t, format, style)))
      if (!linkDef) {
        linkKey = ''
        out.push(...pieces)
        continue
      }
      if (linkKey !== linkDef._key) {
        linkKey = String(linkDef._key)
        out.push(element({ type: 'link', url: typeof linkDef.href === 'string' ? linkDef.href : '', rel: null, target: null, title: null }))
      }
      out[out.length - 1].children!.push(...pieces)
    }
    return out
  }

  const textElement = (block: PortableTextBlock): LexicalJSON => {
    const fields = { format: typeof block.align === 'string' ? block.align : '', indent: typeof block.indent === 'number' ? Math.max(0, Math.floor(block.indent)) : 0, children: inlineNodes(block) }
    if (/^h[1-6]$/.test(block.style)) return element({ type: 'heading', tag: block.style, ...fields })
    if (block.style === 'blockquote') return element({ type: 'quote', ...fields })
    return element({ type: 'paragraph', textFormat: 0, textStyle: '', ...fields })
  }

  const list = (block: PortableTextBlock): LexicalJSON => {
    const type = block.listItem ?? 'bullet'
    return element({ type: 'list', listType: type, tag: type === 'number' ? 'ol' : 'ul', start: typeof block.start === 'number' ? block.start : 1 })
  }

  const children: LexicalJSON[] = []
  // The lists open at this point, outermost first
  let open: { node: LexicalJSON; level: number; listItem: string }[] = []

  for (const block of content) {
    if (!isObject(block) || typeof block._type !== 'string') continue
    const b = block as unknown as PortableTextBlock
    if (b._type !== 'block') {
      open = []
      children.push(fromObject(block as PortableTextObject))
      continue
    }
    if (!b.listItem) {
      open = []
      children.push(textElement(b))
      continue
    }
    const level = Math.max(1, Math.floor(b.level ?? 1))
    const last = () => open[open.length - 1]
    // Back out of what's deeper, and out of another kind of list at this depth
    while (open.length && (last().level > level || (last().level === level && last().listItem !== b.listItem))) open.pop()
    if (!open.length) {
      const node = list(b)
      children.push(node)
      open.push({ node, level: 1, listItem: level === 1 ? b.listItem : 'bullet' })
    }
    // A deeper list sits in an item of its own
    while (last().level < level) {
      const node = list(b)
      const parent = last()
      parent.node.children!.push(element({ type: 'listitem', value: parent.node.children!.length + 1, indent: parent.level - 1, children: [node] }))
      open.push({ node, level: parent.level + 1, listItem: b.listItem })
    }
    const at = last().node.children!
    at.push(element({ type: 'listitem', value: at.length + 1, indent: level - 1, ...(b.listItem === 'check' ? { checked: b.checked === true } : {}), format: typeof b.align === 'string' ? b.align : '', children: inlineNodes(b) }))
  }

  // An editor can't open with nothing in it
  if (!children.length) children.push(element({ type: 'paragraph', textFormat: 0, textStyle: '' }))
  return element({ type: 'root', children })
}

/** Portable Text from a saved string, or null when it isn't: markdown can start with "[" too */
export const parsePortableText = (source: string): unknown[] | null => {
  const s = source.trim()
  if (!s.startsWith('[')) return null
  try {
    const parsed: unknown = JSON.parse(s)
    return Array.isArray(parsed) && parsed.every((b) => isObject(b) && typeof b._type === 'string') ? parsed : null
  } catch {
    return null
  }
}
