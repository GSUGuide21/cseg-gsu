import { parseRichText } from '@/lib/richtext'

type Node = Record<string, unknown> & { type?: string; children?: Node[] }

export interface DocumentCheck {
  id: string
  /** "warning" is worth fixing first; "info" is only worth knowing */
  tone: 'warning' | 'info'
  message: string
}

/** The images and links in a piece of writing (rich text; older markdown bodies have neither) */
export const documentAssets = (bodies: readonly string[]) => {
  const images: { src: string; alt: string }[] = []
  const links: string[] = []
  const walk = (node: Node) => {
    if ((node.type === 'image' || node.type === 'inline-image') && typeof node.src === 'string') images.push({ src: node.src, alt: typeof node.alt === 'string' ? node.alt : '' })
    if ((node.type === 'link' || node.type === 'autolink') && typeof node.url === 'string') links.push(node.url)
    if (node.type === 'inline-button' && typeof node.href === 'string') links.push(node.href)
    if (node.type === 'image' && typeof node.href === 'string' && node.href) links.push(node.href)
    if (node.type === 'file' && typeof node.href === 'string') links.push(node.href)
    if (node.type === 'gallery' && Array.isArray(node.items))
      for (const p of node.items as { src?: unknown; alt?: unknown }[]) if (typeof p?.src === 'string') images.push({ src: p.src, alt: typeof p.alt === 'string' ? p.alt : '' })
    node.children?.forEach(walk)
  }
  for (const body of bodies) {
    const root = parseRichText(body)
    if (root) walk(root as unknown as Node)
  }
  return { images, links: [...new Set(links)] }
}

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)

/** What's worth a look before publishing. None of it stops anyone publishing. */
export const documentChecks = ({ kind, title, summary, cover, category, words, bodies }: { kind: 'post' | 'page'; title: string; summary: string; cover: string; category?: string | null; words: number; bodies: readonly string[] }) => {
  const checks: DocumentCheck[] = []
  const { images, links } = documentAssets(bodies)
  const undescribed = images.filter((i) => !i.alt.trim()).length
  const insecure = links.filter((l) => l.startsWith('http://')).length

  if (!words) checks.push({ id: 'empty', tone: 'warning', message: 'Nothing written yet.' })
  if (undescribed) checks.push({ id: 'alt', tone: 'warning', message: `${plural(undescribed, 'image has', 'images have')} no description for people who can’t see them.` })
  if (insecure) checks.push({ id: 'http', tone: 'warning', message: `${plural(insecure, 'link uses', 'links use')} http://, which browsers may warn about.` })
  if (title.length > 70) checks.push({ id: 'title', tone: 'info', message: 'The title is long, and search results may cut it off.' })
  if (!summary.trim()) checks.push({ id: 'summary', tone: 'info', message: `No ${kind === 'post' ? 'summary' : 'description'}, so the start of the writing is used.` })
  if (kind === 'post' && !cover.trim()) checks.push({ id: 'cover', tone: 'info', message: 'No cover image, so link previews use a generated one.' })
  if (kind === 'post' && !category) checks.push({ id: 'category', tone: 'info', message: 'No category, so it only shows under All posts.' })
  return checks
}
