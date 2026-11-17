import type PptxGenJS from 'pptxgenjs'

import { SHAPE } from '@/lib/pptx/shapes'
import { isHexColor, slideChrome, toneOf, usesSecond } from '@/lib/presentations'
import { parseRichText } from '@/lib/richtext'
import { toPortableText, type LexicalJSON, type PortableTextBlock, type PortableTextObject } from '@/lib/richtext/portableText'
import type { PresentationSettings, PresentationSlide } from '@/lib/supabase/types'

/**
 * A deck as a PowerPoint file (.pptx), made in the browser: each slide in its layout, in the
 * deck's colours, with its own background, its pictures, the footer, and the speaker notes
 * (when they're given: officers only). What PowerPoint can't take from a slide here (a live
 * block such as the events list, or points coming in one at a time) is left out, and a slide's
 * transition is PowerPoint's own to set.
 */

/** PowerPoint's widescreen page, in inches */
const W = 13.333
const H = 7.5
const FONT = 'Montserrat'

type Palette = { bg: string; fg: string; muted: string; brand: string }

/** The deck themes' colours (see globals.css), as PowerPoint takes them: hex, no # */
const PALETTES: Record<PresentationSettings['theme'] | 'dark-tone' | 'light-tone', Palette> = {
  site: { bg: 'FFFFFF', fg: '0F1729', muted: '566074', brand: '0039A6' },
  light: { bg: 'FFFFFF', fg: '0F1729', muted: '566074', brand: '0039A6' },
  dark: { bg: '0B0F19', fg: 'F1F4F9', muted: 'A3ACBD', brand: '6D9BFF' },
  brand: { bg: '0039A6', fg: 'FFFFFF', muted: 'D3E0FF', brand: 'FFD166' },
  paper: { bg: 'FBF6EC', fg: '2A2118', muted: '6A5C4B', brand: '9A3412' },
  'dark-tone': { bg: '0B0F19', fg: 'F1F4F9', muted: 'D3D8E2', brand: '9DBBFF' },
  'light-tone': { bg: 'FFFFFF', fg: '0F1729', muted: '3F4859', brand: '0039A6' },
}

type Run = PptxGenJS.TextProps


/** A picture, fetched and read, ready to put in: its data and its shape */
type Picture = { data: string; w: number; h: number }

/** A picture from its address, or null when it can't be had (another site that won't share it, or not a picture) */
const fetchPicture = async (src: string): Promise<Picture | null> => {
  try {
    const res = await fetch(src, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.type.startsWith('image/') || blob.type === 'image/svg+xml') return null
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
    const size = typeof createImageBitmap === 'function' ? await createImageBitmap(blob).then((b) => ({ w: b.width, h: b.height })) : { w: 4, h: 3 }
    // PowerPoint's form: "image/png;base64,…"
    return { data: data.replace(/^data:/, ''), ...size }
  } catch {
    return null
  }
}

/** The words of a run, marked as written */
const span = (text: string, marks: readonly string[], defs: Map<string, PortableTextObject>, base: Run['options']): Run => {
  const link = marks.map((m) => defs.get(m)).find((d) => d?._type === 'link')
  return {
    text,
    options: {
      ...base,
      bold: base?.bold || marks.includes('strong') || undefined,
      italic: base?.italic || marks.includes('em') || undefined,
      underline: marks.includes('underline') ? { style: 'sng' } : undefined,
      strike: marks.includes('strike-through') ? 'sngStrike' : undefined,
      hyperlink: link && typeof link.href === 'string' && /^(https?:|mailto:)/.test(link.href) ? { url: link.href } : undefined,
    },
  }
}

/** One paragraph's runs, the last ending the line, each carrying the paragraph's own settings */
const paragraph = (runs: Run[], para: Run['options']): Run[] => {
  const all = runs.length ? runs : [{ text: '', options: {} }]
  return all.map((r, i) => ({ text: r.text, options: { ...para, ...r.options, breakLine: i === all.length - 1 || undefined } }))
}

/** Markdown (how some slides were first written) as paragraphs: lists, headings, quotes, bold and italic */
const markdownRuns = (source: string, size: number): Run[] =>
  source
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .flatMap((line) => {
      const indent = Math.floor((line.match(/^\s*/)?.[0].length ?? 0) / 2)
      let text = line.trim()
      const para: Run['options'] = { fontSize: size }
      const bullet = text.match(/^[-*+]\s+/)
      const numbered = text.match(/^\d+[.)]\s+/)
      const heading = text.match(/^#{1,6}\s+/)
      const quote = text.match(/^>\s*/)
      if (bullet || numbered) {
        text = text.slice((bullet ?? numbered)![0].length)
        Object.assign(para, { bullet: numbered ? { type: 'number' } : true, indentLevel: indent })
      } else if (heading) {
        text = text.slice(heading[0].length)
        Object.assign(para, { bold: true, fontSize: size + 4 })
      } else if (quote) {
        text = text.slice(quote[0].length)
        para.italic = true
      }
      // **bold**, *italic*, and [words](link)
      const runs: Run[] = []
      const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|\[(.+?)\]\((.+?)\)/g
      let last = 0
      for (const m of text.matchAll(pattern)) {
        if (m.index > last) runs.push({ text: text.slice(last, m.index), options: {} })
        if (m[1]) runs.push({ text: m[1], options: { bold: true } })
        else if (m[2] || m[3]) runs.push({ text: (m[2] ?? m[3])!, options: { italic: true } })
        else runs.push({ text: m[4], options: /^(https?:|mailto:)/.test(m[5]) ? { hyperlink: { url: m[5] } } : {} })
        last = m.index + m[0].length
      }
      if (last < text.length) runs.push({ text: text.slice(last), options: {} })
      return paragraph(runs, para)
    })

/** A slide's writing as PowerPoint text: a paragraph per block, lists as bullets at their depth */
export const writingRuns = (source: string | undefined, size: number): Run[] => {
  if (!source?.trim()) return []
  const root = parseRichText(source)
  if (!root) return markdownRuns(source, size)
  const blocks = toPortableText(root as unknown as LexicalJSON)
  return blocks.flatMap((b) => {
    if (b._type !== 'block') {
      // A block of the site's own: its caption or title, if it has words
      const o = b as PortableTextObject
      const words = [o.caption, o.title, o.text].find((v): v is string => typeof v === 'string' && !!v.trim())
      return words ? paragraph([{ text: words, options: { italic: true } }], { fontSize: size }) : []
    }
    const block = b as PortableTextBlock
    const defs = new Map(block.markDefs.map((d) => [d._key, d]))
    const heading = /^h[1-6]$/.test(block.style)
    const para: Run['options'] = { fontSize: heading ? size + (block.style === 'h1' || block.style === 'h2' ? 6 : 3) : size }
    if (heading) para.bold = true
    if (block.style === 'blockquote') para.italic = true
    if (block.align === 'center' || block.align === 'right' || block.align === 'justify') para.align = block.align
    if (block.listItem) Object.assign(para, { bullet: block.listItem === 'number' ? { type: 'number' } : true, indentLevel: Math.max(0, (block.level ?? 1) - 1) })
    const runs = block.children.flatMap((c): Run[] => {
      if (c._type === 'span') return [span(String(c.text ?? ''), Array.isArray(c.marks) ? (c.marks as string[]) : [], defs, {})]
      if (c._type === 'linebreak') return [{ text: '', options: { breakLine: true } }]
      return []
    })
    return paragraph(runs, para)
  })
}

const text = (options: PptxGenJS.TextPropsOptions): PptxGenJS.TextPropsOptions => ({ fontFace: FONT, valign: 'top', margin: 0, fit: 'shrink', paraSpaceAfter: 6, ...options })

export interface ExportedDeck {
  title: string
  slides: readonly PresentationSlide[]
  settings: PresentationSettings
  /** Each slide's speaker notes, by id; left out on the site, where they aren't shown */
  notes?: Record<string, string>
}

/** A file name from the deck's title */
const fileName = (title: string) => `${title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Presentation'}.pptx`

/**
 * Makes the deck's .pptx and hands it to the browser to save. Hidden slides go in hidden, as
 * PowerPoint has them. Pictures from sites that won't share them are left out; the count of
 * those comes back, to say so.
 */
export async function exportPptx(deck: ExportedDeck): Promise<{ missingPictures: number }> {
  const { pptx, missingPictures } = await buildPptx(deck)
  await pptx.writeFile({ fileName: fileName(deck.title) })
  return { missingPictures }
}

/** The deck as a PowerPoint presentation, made but not yet saved anywhere */
export async function buildPptx(deck: ExportedDeck): Promise<{ pptx: PptxGenJS; missingPictures: number }> {
  const { default: Pptx } = await import('pptxgenjs')
  const pptx = new Pptx()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = deck.title
  pptx.company = 'Campus Survival and Engagement Group'
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT }

  const pictures = new Map<string, Promise<Picture | null>>()
  const picture = (src: string | undefined) => {
    if (!src?.trim()) return Promise.resolve(null)
    const at = new URL(src, window.location.href).href
    if (!pictures.has(at)) pictures.set(at, fetchPicture(at))
    return pictures.get(at)!
  }
  let missing = 0
  const logo = deck.settings.logo ? await picture('/assets/logos/logo-wbl.png') : null
  const deckPalette = PALETTES[deck.settings.theme]
  let number = 0

  for (const s of deck.slides) {
    if (!s.hidden) number++
    const slide = pptx.addSlide()
    if (s.hidden) slide.hidden = true
    const layout = s.layout ?? 'content'

    // Its background, and the colours its words are drawn in on it
    const bgPicture = layout === 'image-full' ? await picture(s.image) : s.bgImage ? await picture(s.bgImage) : null
    if ((layout === 'image-full' && s.image) || s.bgImage) missing += bgPicture ? 0 : 1
    const colour = !bgPicture && layout !== 'image-full' && isHexColor(s.bgColor) ? s.bgColor.slice(1).toUpperCase() : null
    const palette = bgPicture || layout === 'image-full' ? PALETTES['dark-tone'] : colour ? PALETTES[`${toneOf(`#${colour}`)}-tone`] : deckPalette
    slide.background = { color: colour ?? (layout === 'image-full' ? '0B0F19' : palette.bg) }
    if (bgPicture) {
      slide.addImage({ data: bgPicture.data, x: 0, y: 0, w: bgPicture.w, h: bgPicture.h, sizing: { type: 'cover', w: W, h: H }, objectName: layout === 'image-full' ? SHAPE.fullPicture : SHAPE.background })
      // Darkened under the words, as on the site
      slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: '000000', transparency: 45 }, line: { type: 'none' } })
    }

    const titleRun = (size: number, extra: PptxGenJS.TextPropsOptions = {}) => (s.title ? slide.addText(s.title, text({ bold: true, fontSize: size, color: palette.fg, objectName: SHAPE.title, ...extra })) : undefined)
    const body = (source: string | undefined, box: PptxGenJS.TextPropsOptions, size = 20, colour = palette.fg) => {
      const runs = writingRuns(source, size)
      if (runs.length) slide.addText(runs, text({ color: colour, ...box }))
    }

    if (layout === 'title') {
      titleRun(44, { x: 0.9, y: 2.0, w: W - 1.8, h: 1.8, align: 'center', valign: 'bottom', objectName: SHAPE.centeredTitle })
      body(s.body, { x: 1.6, y: 4.0, w: W - 3.2, h: 2.0, align: 'center' }, 22, palette.muted)
    } else if (layout === 'section') {
      slide.addShape('rect', { x: 0.9, y: 2.55, w: 1.0, h: 0.09, fill: { color: palette.brand }, line: { type: 'none' } })
      titleRun(40, { x: 0.9, y: 2.8, w: W - 1.8, h: 1.4, valign: 'middle' })
      body(s.body, { x: 0.9, y: 4.3, w: W - 1.8, h: 2.0 }, 22, palette.muted)
    } else if (layout === 'image-full') {
      titleRun(36, { x: 0.8, y: 3.9, w: W - 1.6, h: 1.1, valign: 'bottom' })
      body(s.body, { x: 0.8, y: 5.1, w: W - 1.6, h: 1.7 }, 20)
    } else if (layout === 'image-left' || layout === 'image-right') {
      const left = layout === 'image-left'
      const words = { x: left ? 7.0 : 0.7, w: 5.6 }
      titleRun(32, { ...words, y: 0.9, h: 1.2, valign: 'bottom' })
      body(s.body, { ...words, y: 2.3, h: 4.3 })
      const pic = await picture(s.image)
      if (s.image && !pic) missing++
      if (pic) slide.addImage({ data: pic.data, x: left ? 0.7 : 7.0, y: 1.65, w: pic.w, h: pic.h, sizing: { type: 'cover', w: 5.6, h: 4.2 }, rounding: false })
    } else if (usesSecond(layout)) {
      titleRun(32, { x: 0.7, y: 0.5, w: W - 1.4, h: 1.0, valign: 'bottom' })
      const top = layout === 'comparison' ? 2.5 : 1.8
      ;[
        { x: 0.7, label: s.label, source: s.body },
        { x: 6.9, label: s.label2, source: s.body2 },
      ].forEach((col) => {
        if (layout === 'comparison') {
          slide.addText(col.label ?? '', text({ x: col.x, y: 1.75, w: 5.7, h: 0.6, bold: true, fontSize: 24, color: palette.fg, valign: 'bottom', objectName: SHAPE.heading(col.x < W / 2 ? 1 : 2) }))
          slide.addShape('line', { x: col.x, y: 2.38, w: 5.7, h: 0, line: { color: palette.brand, width: 2 } })
        }
        body(col.source, { x: col.x, y: top, w: 5.7, h: H - top - 0.9 })
      })
    } else if (layout === 'quote') {
      slide.addText('“', text({ x: 0.9, y: 0.8, w: W - 1.8, h: 1.4, fontSize: 110, bold: true, color: palette.brand, align: 'center', valign: 'bottom', fit: 'none', objectName: SHAPE.quoteMark }))
      body(s.body, { x: 1.4, y: 2.3, w: W - 2.8, h: 3.0, align: 'center', valign: 'middle', italic: true, bold: true }, 30)
      if (s.title) slide.addText(`— ${s.title}`, text({ x: 1.4, y: 5.4, w: W - 2.8, h: 0.6, fontSize: 20, color: palette.muted, align: 'center', objectName: SHAPE.attribution }))
    } else if (layout === 'blank') {
      body(s.body, { x: 0.8, y: 0.7, w: W - 1.6, h: H - 1.7 })
    } else {
      titleRun(32, { x: 0.7, y: 0.5, w: W - 1.4, h: 1.0, valign: 'bottom' })
      body(s.body, { x: 0.7, y: 1.75, w: W - 1.4, h: H - 2.65 })
    }

    // Along the bottom: the logo, the footer, and the slide's number, as on the site
    const chrome = slideChrome(deck.settings, number, layout)
    if (chrome) {
      let x = 0.55
      if (chrome.logo && logo) {
        slide.addImage({ data: logo.data, x, y: H - 0.72, w: 0.42, h: 0.42, rounding: true, objectName: SHAPE.logo })
        x += 0.6
      }
      if (chrome.footer) slide.addText(chrome.footer, text({ x, y: H - 0.7, w: W - x - 1.5, h: 0.4, fontSize: 12, color: palette.muted, valign: 'middle', fit: 'none', objectName: SHAPE.footer }))
      if (chrome.number) slide.addText(String(chrome.number), text({ x: W - 1.3, y: H - 0.7, w: 0.75, h: 0.4, fontSize: 12, bold: true, color: palette.muted, align: 'right', valign: 'middle', fit: 'none', objectName: SHAPE.number }))
    }

    const note = deck.notes?.[s.id]?.trim()
    if (note) slide.addNotes(note)
  }

  return { pptx, missingPictures: missing }
}
