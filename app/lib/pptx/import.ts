import type JSZip from 'jszip'

import type { PortableTextBlock } from '@/lib/richtext/portableText'
import { SHAPE } from '@/lib/pptx/shapes'
import type { PresentationSlide, SlideLayout } from '@/lib/supabase/types'

/**
 * A PowerPoint file (.pptx) as this site's slides, read in the browser. A slide here has a
 * layout rather than boxes placed anywhere, so each one is read for what it says: its title,
 * its writing (lists stay lists, at their depth, with bold, italic, underline, and links), a
 * second column when it has two side by side, its first picture, its background, whether it's
 * hidden, and its speaker notes. Then it's given the layout closest to how it looked. Shapes,
 * charts, animations, and where things sat exactly don't come across; a table comes as lines.
 */

const NS = {
  p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
}

/** Pictures a browser can show, by their extension */
const PICTURE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' }

/** What came of reading a file: its slides, their notes by slide id, and what had to be left behind */
export interface ImportedDeck {
  slides: PresentationSlide[]
  notes: Record<string, string>
  /** Pictures that didn't come across (a kind a browser can't show, or a failed upload) */
  missingPictures: number
  /** Slides past the most a deck can have */
  leftOver: number
}

const xml = (source: string) => new DOMParser().parseFromString(source, 'application/xml')
const all = (el: Document | Element, ns: keyof typeof NS, name: string) => Array.from(el.getElementsByTagNameNS(NS[ns], name))
const first = (el: Document | Element, ns: keyof typeof NS, name: string) => el.getElementsByTagNameNS(NS[ns], name)[0] ?? null
/** Children (not deeper) with this name */
const kids = (el: Element, ns: keyof typeof NS, name: string) => Array.from(el.children).filter((c) => c.namespaceURI === NS[ns] && c.localName === name)
const rAttr = (el: Element | null, name: string) => el?.getAttributeNS(NS.r, name) ?? null

/** A path inside the file, from one file's relative link */
const resolve = (from: string, target: string) => {
  if (target.startsWith('/')) return target.slice(1)
  const parts = from.split('/').slice(0, -1)
  for (const step of target.split('/')) {
    if (step === '..') parts.pop()
    else if (step !== '.') parts.push(step)
  }
  return parts.join('/')
}

/** A file's links (rId → where, and of what kind) */
const relations = async (zip: JSZip, path: string) => {
  const relsPath = `${path.split('/').slice(0, -1).join('/')}/_rels/${path.split('/').pop()}.rels`
  const source = await zip.file(relsPath)?.async('string')
  const map = new Map<string, { target: string; type: string; external: boolean }>()
  if (!source) return map
  for (const r of all(xml(source), 'rel', 'Relationship')) {
    const external = r.getAttribute('TargetMode') === 'External'
    const target = r.getAttribute('Target') ?? ''
    map.set(r.getAttribute('Id') ?? '', { target: external ? target : resolve(path, target), type: r.getAttribute('Type') ?? '', external })
  }
  return map
}

let keyCount = 0
const key = () => `i${(keyCount++).toString(36)}`

type Rels = Awaited<ReturnType<typeof relations>>

/**
 * A text body's paragraphs as Portable Text. In a placeholder for writing, a paragraph is a
 * point unless it says it isn't, as PowerPoint's own layouts have it; in a text box, the
 * other way round.
 */
const paragraphs = (body: Element, rels: Rels, bulletedByDefault: boolean): PortableTextBlock[] =>
  kids(body, 'a', 'p').flatMap((p): PortableTextBlock[] => {
    const props = kids(p, 'a', 'pPr')[0] ?? null
    const level = Number(props?.getAttribute('lvl') ?? 0)
    const markDefs: PortableTextBlock['markDefs'] = []
    const children: PortableTextBlock['children'] = []
    for (const run of Array.from(p.children)) {
      if (run.namespaceURI !== NS.a) continue
      // A line break inside a paragraph: the words either side stay apart
      if (run.localName === 'br') {
        children.push({ _type: 'span', _key: key(), text: ' ', marks: [] })
        continue
      }
      if (run.localName !== 'r') continue
      const t = first(run, 'a', 't')?.textContent ?? ''
      if (!t) continue
      const rPr = kids(run, 'a', 'rPr')[0] ?? null
      const marks: string[] = []
      if (rPr?.getAttribute('b') === '1') marks.push('strong')
      if (rPr?.getAttribute('i') === '1') marks.push('em')
      if (rPr && rPr.getAttribute('u') && rPr.getAttribute('u') !== 'none') marks.push('underline')
      if (rPr?.getAttribute('strike') && rPr.getAttribute('strike') !== 'noStrike') marks.push('strike-through')
      const link = rels.get(rAttr(rPr ? first(rPr, 'a', 'hlinkClick') : null, 'id') ?? '')
      if (link?.external && /^(https?:|mailto:)/.test(link.target)) {
        const def = { _type: 'link', _key: key(), href: link.target }
        markDefs.push(def)
        marks.push(def._key)
      }
      children.push({ _type: 'span', _key: key(), text: t, marks })
    }
    const words = children.map((c) => String(c.text ?? '')).join('')
    if (!words.trim()) return []
    const off = props && (first(props, 'a', 'buNone') !== null)
    const numbered = props && first(props, 'a', 'buAutoNum') !== null
    const char = props && first(props, 'a', 'buChar') !== null
    const point = numbered || char || (bulletedByDefault && !off)
    return [{ _type: 'block', _key: key(), style: 'normal', markDefs, children, ...(point ? { listItem: numbered ? 'number' : 'bullet', level: level + 1 } : {}) }]
  })

/** Where a shape sits on the slide, in the file's units, if it says */
const placeOf = (el: Element) => {
  const off = first(el, 'a', 'off')
  const ext = first(el, 'a', 'ext')
  return off && ext ? { x: Number(off.getAttribute('x')), y: Number(off.getAttribute('y')), w: Number(ext.getAttribute('cx')), h: Number(ext.getAttribute('cy')) } : null
}

/** A table's rows as lines: its cells' words, side by side */
const tableLines = (frame: Element): PortableTextBlock[] =>
  all(frame, 'a', 'tr')
    .map((tr) =>
      all(tr, 'a', 'tc')
        .map((tc) => all(tc, 'a', 't').map((t) => t.textContent ?? '').join(''))
        .join('  ·  ')
    )
    .filter((line) => line.trim())
    .map((line) => ({ _type: 'block', _key: key(), style: 'normal', markDefs: [], children: [{ _type: 'span', _key: key(), text: line, marks: [] }] }))

const words = (blocks: readonly PortableTextBlock[]) => blocks.flatMap((b) => b.children.map((c) => String(c.text ?? ''))).join(' ').trim()
const asBody = (blocks: readonly PortableTextBlock[]) => (blocks.length ? JSON.stringify(blocks) : '')

/** A colour PowerPoint gives as hex, as a slide background */
const solidColour = (bg: Element | null) => {
  const fill = bg ? first(bg, 'a', 'solidFill') : null
  const rgb = fill ? first(fill, 'a', 'srgbClr')?.getAttribute('val') : null
  return rgb && /^[0-9a-f]{6}$/i.test(rgb) ? `#${rgb.toLowerCase()}` : undefined
}

/**
 * Reads a .pptx into slides. `upload` puts a picture in the site's library and gives back its
 * address; `room` is how many more slides the deck can take.
 */
export async function importPptx(file: Blob | ArrayBuffer, upload: (picture: File) => Promise<string>, room: number): Promise<ImportedDeck> {
  const { default: Zip } = await import('jszip')
  const zip = await Zip.loadAsync(file)
  const presPath = 'ppt/presentation.xml'
  const presSource = await zip.file(presPath)?.async('string')
  if (!presSource) throw new Error('That isn’t a PowerPoint file (.pptx).')
  const pres = xml(presSource)
  const size = first(pres, 'p', 'sldSz')
  const slideW = Number(size?.getAttribute('cx') ?? 12192000)
  const slideH = Number(size?.getAttribute('cy') ?? 6858000)
  const presRels = await relations(zip, presPath)
  const paths = all(pres, 'p', 'sldId')
    .map((s) => presRels.get(rAttr(s, 'id') ?? '')?.target)
    .filter((t): t is string => !!t)

  const uploaded = new Map<string, Promise<string | null>>()
  let missingPictures = 0
  const pictureAt = (path: string) => {
    if (!uploaded.has(path)) {
      uploaded.set(
        path,
        (async () => {
          const ext = path.split('.').pop()?.toLowerCase() ?? ''
          const type = PICTURE_TYPES[ext]
          const blob = type ? await zip.file(path)?.async('blob') : undefined
          if (!type || !blob) return null
          try {
            return await upload(new File([blob], path.split('/').pop() ?? `picture.${ext}`, { type }))
          } catch {
            return null
          }
        })()
      )
    }
    return uploaded.get(path)!
  }

  const slides: PresentationSlide[] = []
  const notes: Record<string, string> = {}
  for (const path of paths.slice(0, Math.max(0, room))) {
    const source = await zip.file(path)?.async('string')
    if (!source) continue
    const doc = xml(source)
    const rels = await relations(zip, path)
    const slide: PresentationSlide = { id: crypto.randomUUID(), title: '', body: '' }
    if (doc.documentElement.getAttribute('show') === '0') slide.hidden = true

    let titleKind: string | null = null
    const labels: string[] = []
    let fullPicture: string | null = null
    const texts: { blocks: PortableTextBlock[]; place: ReturnType<typeof placeOf>; kind: string | null }[] = []
    const pictures: { path: string; place: ReturnType<typeof placeOf> }[] = []
    let bgPicture: string | null = null
    const tree = first(doc, 'p', 'spTree')
    for (const el of tree ? all(tree, 'p', 'sp').concat(all(tree, 'p', 'pic'), all(tree, 'p', 'graphicFrame')) : []) {
      const ph = first(el, 'p', 'ph')
      // What it's called: this site names the shapes it writes (see SHAPE), and PowerPoint names its title "Title 1"
      const name = first(el, 'p', 'cNvPr')?.getAttribute('name') ?? ''
      const named = (n: string) => name === n
      const kind = ph ? (ph.getAttribute('type') ?? 'body') : named(SHAPE.centeredTitle) ? 'ctrTitle' : /^Title( \d+)?$/.test(name) ? 'title' : null
      if (named(SHAPE.logo) || named(SHAPE.footer) || named(SHAPE.number) || named(SHAPE.quoteMark)) continue
      if (el.localName === 'pic') {
        const target = rels.get(rAttr(first(el, 'a', 'blip'), 'embed') ?? '')
        if (!target || target.external) continue
        if (named(SHAPE.background)) bgPicture = target.target
        else if (named(SHAPE.fullPicture)) fullPicture = target.target
        else pictures.push({ path: target.target, place: placeOf(el) })
        continue
      }
      const label = named(SHAPE.heading(1)) ? 0 : named(SHAPE.heading(2)) ? 1 : -1
      if (label >= 0) {
        labels[label] = all(el, 'a', 't').map((t) => t.textContent ?? '').join(' ').trim()
        continue
      }
      if (named(SHAPE.attribution)) {
        slide.title = all(el, 'a', 't').map((t) => t.textContent ?? '').join(' ').replace(/^\s*[\u2014\u2013-]\s*/, '').trim()
        slide.layout = 'quote'
        continue
      }
      if (el.localName === 'graphicFrame') {
        const lines = tableLines(el)
        if (lines.length) texts.push({ blocks: lines, place: placeOf(el), kind: null })
        continue
      }
      // The slide number, date, and footer placeholders are the deck's, not the slide's
      if (kind === 'sldNum' || kind === 'dt' || kind === 'ftr') continue
      const body = first(el, 'p', 'txBody')
      if (!body) continue
      if ((kind === 'title' || kind === 'ctrTitle') && !slide.title) {
        slide.title = all(body, 'a', 't')
          .map((t) => t.textContent ?? '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        titleKind = kind
        continue
      }
      const blocks = paragraphs(body, rels, kind === 'body' || kind === 'obj')
      if (blocks.length) texts.push({ blocks, place: placeOf(el), kind })
    }

    // Two boxes of writing side by side make two columns; otherwise it's all one, top to bottom
    const writing = texts.filter((t) => words(t.blocks))
    const [a, b] = writing
    const sideBySide =
      writing.length === 2 && a.place && b.place && Math.abs(a.place.y - b.place.y) < slideH * 0.15 && Math.abs(a.place.x - b.place.x) > slideW * 0.25 && a.place.w < slideW * 0.6 && b.place.w < slideW * 0.6
    if (sideBySide) {
      const [left, right] = a.place!.x <= b.place!.x ? [a, b] : [b, a]
      slide.layout = labels.length ? 'comparison' : 'two-column'
      slide.body = asBody(left.blocks)
      slide.body2 = asBody(right.blocks)
      if (labels[0]) slide.label = labels[0]
      if (labels[1]) slide.label2 = labels[1]
    } else {
      writing.sort((x, y) => (x.place?.y ?? 0) - (y.place?.y ?? 0))
      slide.body = asBody(writing.flatMap((t) => t.blocks))
    }

    // The background, and the first picture: filling the slide, or beside the words
    const bg = first(doc, 'p', 'bg')
    const bgBlip = bg ? rels.get(rAttr(first(bg, 'a', 'blip'), 'embed') ?? '') : undefined
    const colour = solidColour(bg)
    const behind = bgPicture ?? (bgBlip && !bgBlip.external ? bgBlip.target : null)
    if (fullPicture) {
      const src = await pictureAt(fullPicture)
      if (src) slide.image = src
      else missingPictures++
      slide.layout = 'image-full'
    } else if (behind) {
      const src = await pictureAt(behind)
      if (src) slide.bgImage = src
      else missingPictures++
    } else if (colour) slide.bgColor = colour

    const pic = slide.layout === 'image-full' ? undefined : pictures[0]
    if (pic) {
      const src = await pictureAt(pic.path)
      if (!src) missingPictures++
      else {
        slide.image = src
        const big = pic.place && pic.place.w > slideW * 0.75 && pic.place.h > slideH * 0.6
        const leftSide = pic.place && pic.place.x + pic.place.w / 2 < slideW / 2
        const layout: SlideLayout = big ? 'image-full' : leftSide ? 'image-left' : 'image-right'
        // Two columns keep their columns; the picture still comes along, for another layout
        if (!slide.layout) slide.layout = layout
      }
    }
    if (!slide.layout && titleKind === 'ctrTitle') slide.layout = 'title'
    else if (!slide.layout && !slide.title && slide.body) slide.layout = 'blank'
    else if (!slide.layout && slide.title && !slide.body && !pic) slide.layout = 'section'

    // Its speaker notes: the notes page's writing
    const notesRel = [...rels.values()].find((r) => r.type.endsWith('/notesSlide'))
    const notesSource = notesRel ? await zip.file(notesRel.target)?.async('string') : undefined
    if (notesSource) {
      const notesDoc = xml(notesSource)
      const said = all(notesDoc, 'p', 'sp')
        .filter((sp) => first(sp, 'p', 'ph')?.getAttribute('type') === 'body')
        .flatMap((sp) => all(sp, 'a', 'p').map((p) => all(p, 'a', 't').map((t) => t.textContent ?? '').join('')))
        .join('\n')
        .trim()
      if (said) notes[slide.id] = said
    }

    slides.push(slide)
  }

  return { slides, notes, missingPictures, leftOver: Math.max(0, paths.length - Math.max(0, room)) }
}
