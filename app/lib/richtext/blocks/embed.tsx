import { AppWindow } from 'lucide-react'
import type { FC } from 'react'

import { textOf } from './inline'

/**
 * Something from another site, shown in the page: a Google Form, a map, a calendar, a
 * playlist, an Instagram post. Only the sites listed here can be embedded, each at the
 * address its own "embed" option gives, so nothing else can end up in the page; and it
 * runs boxed in (a sandboxed frame), apart from the site around it.
 */

export type EmbedData = {
  /** The frame's address, as one of the known sites gives it */
  src: string
  /** Names the frame for screen readers, and shows under it */
  title: string
  /** How tall it is, in pixels */
  height: number
}

export const EMBED_TITLE_MAX = 150
export const EMBED_HEIGHT = { min: 150, max: 1600, fallback: 480 } as const

type Found = { src: string; provider: string; height: number }

const GOOGLE_HOSTS = new Set(['google.com', 'www.google.com'])

/** Each site that can be embedded: the address its frame takes, from a link to it (or from its own embed code) */
const PROVIDERS: ((url: URL, host: string, parts: string[]) => Found | null)[] = [
  // Google Forms: …/forms/d/e/<id>/viewform
  (url, host, parts) => {
    if (host !== 'docs.google.com' || parts[0] !== 'forms') return null
    const at = parts.indexOf('viewform')
    if (at < 0) return null
    return { src: `https://docs.google.com/${parts.slice(0, at + 1).join('/')}?embedded=true`, provider: 'Google Form', height: 800 }
  },
  // Google Docs, Sheets, and Slides: the published or preview view
  (url, host, parts) => {
    if (host !== 'docs.google.com' || !['document', 'spreadsheets', 'presentation'].includes(parts[0]) || parts[1] !== 'd') return null
    const last = parts[parts.length - 1]
    const view = ['pub', 'pubhtml', 'embed', 'preview'].includes(last) ? last : 'preview'
    const id = ['edit', 'view', 'pub', 'pubhtml', 'embed', 'preview'].includes(last) ? parts.slice(0, -1) : parts
    const name = parts[0] === 'document' ? 'Google Doc' : parts[0] === 'spreadsheets' ? 'Google Sheet' : 'Google Slides'
    return { src: `https://docs.google.com/${id.join('/')}/${view}`, provider: name, height: parts[0] === 'presentation' ? 480 : 640 }
  },
  // A file in Google Drive: …/file/d/<id>/view
  (url, host, parts) => (host === 'drive.google.com' && parts[0] === 'file' && parts[1] === 'd' && parts[2] ? { src: `https://drive.google.com/file/d/${parts[2]}/preview`, provider: 'Google Drive file', height: 640 } : null),
  // Google Maps: only the address from Share → Embed a map (a plain map link can't be framed)
  (url, host, parts) => {
    if (!GOOGLE_HOSTS.has(host) || parts[0] !== 'maps') return null
    if (parts[1] === 'embed' && url.searchParams.get('pb')) return { src: `https://www.google.com/maps/embed?pb=${encodeURIComponent(url.searchParams.get('pb')!)}`, provider: 'Google Map', height: 450 }
    if (parts[1] === 'd' && ['embed', 'viewer', 'edit'].includes(parts[2]) && url.searchParams.get('mid'))
      return { src: `https://www.google.com/maps/d/embed?mid=${encodeURIComponent(url.searchParams.get('mid')!)}`, provider: 'Google My Map', height: 480 }
    return null
  },
  // Google Calendar: the address from its settings' "Integrate calendar"
  (url, host, parts) => {
    const src = url.searchParams.get('src')
    return host === 'calendar.google.com' && parts[0] === 'calendar' && parts[1] === 'embed' && src
      ? { src: `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(src)}${url.searchParams.get('ctz') ? `&ctz=${encodeURIComponent(url.searchParams.get('ctz')!)}` : ''}`, provider: 'Google Calendar', height: 600 }
      : null
  },
  // Spotify: a track, album, playlist, episode, or show
  (url, host, parts) => {
    if (host !== 'open.spotify.com') return null
    const [kind, id] = parts[0] === 'embed' ? parts.slice(1) : parts
    return ['track', 'album', 'playlist', 'episode', 'show'].includes(kind) && /^[A-Za-z0-9]{10,40}$/.test(id ?? '')
      ? { src: `https://open.spotify.com/embed/${kind}/${id}`, provider: 'Spotify', height: kind === 'track' || kind === 'episode' ? 232 : 352 }
      : null
  },
  // Instagram: a post or reel
  (url, host, parts) =>
    (host === 'instagram.com' || host === 'www.instagram.com') && ['p', 'reel'].includes(parts[0]) && /^[\w-]{5,40}$/.test(parts[1] ?? '')
      ? { src: `https://www.instagram.com/${parts[0]}/${parts[1]}/embed`, provider: 'Instagram post', height: 640 }
      : null,
  // Canva: a design shared to view
  (url, host, parts) =>
    (host === 'canva.com' || host === 'www.canva.com') && parts[0] === 'design' && parts[1] && parts[2] && parts[3] === 'view'
      ? { src: `https://www.canva.com/design/${parts[1]}/${parts[2]}/view?embed`, provider: 'Canva design', height: 480 }
      : null,
]

/** The sites, in words, for the dialog */
export const EMBED_SITES = 'Google Forms, Docs, Sheets, Slides, Drive files, Maps and Calendar; Spotify; Instagram posts; and Canva designs'

/**
 * What was pasted, as a frame's address: a link to one of the known sites, or that site's
 * own embed code (the <iframe …> it gives you, whose address is taken out).
 */
export const embedFromInput = (typed: string): Found | null => {
  const t = typed.trim()
  const raw = /<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i.exec(t)?.[1]?.replace(/&amp;/g, '&') ?? t
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.toLowerCase()
  const parts = url.pathname.split('/').filter(Boolean)
  for (const provider of PROVIDERS) {
    const found = provider(url, host, parts)
    if (found) return found
  }
  return null
}

/** A saved frame address, only if one of the known sites would give it again */
export const parseEmbedSrc = (value: unknown) => (typeof value === 'string' ? (embedFromInput(value)?.src ?? '') : '')
export const parseEmbedTitle = (value: unknown) => textOf(value, EMBED_TITLE_MAX)
export const parseEmbedHeight = (value: unknown) => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? Math.min(EMBED_HEIGHT.max, Math.max(EMBED_HEIGHT.min, Math.round(n))) : EMBED_HEIGHT.fallback
}

/** The site an embed is from, in words: "Google Form" */
export const embedProvider = (src: string) => embedFromInput(src)?.provider ?? 'Embed'

/**
 * The frame, or (in the editor, `preview`) a card saying what it is, so a click selects the
 * block rather than landing in the other site
 */
export const Embed: FC<EmbedData & { preview?: boolean }> = ({ src, title, height, preview = false }) => (
  <figure className="my-5">
    {preview ? (
      <div className="flex items-center gap-3.5 rounded-xl border border-line bg-fill p-4" style={{ minHeight: Math.min(height, 160) }}>
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface text-brand">
          <AppWindow size={22} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-bold text-ink">{embedProvider(src)}</span>
          <span className="truncate text-[0.85rem] text-muted">{title || src}</span>
          <span className="text-[0.8rem] text-muted">Shown in the page, {height}px tall</span>
        </span>
      </div>
    ) : (
      <iframe
        src={src}
        title={title || embedProvider(src)}
        loading="lazy"
        height={height}
        // Its own scripts and forms work; it can't reach or redirect the page around it
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="fullscreen; encrypted-media; clipboard-write"
        className="block w-full rounded-xl border border-line bg-surface"
      />
    )}
    {title ? <figcaption className="mt-2 text-center text-[0.85rem] leading-snug text-muted">{title}</figcaption> : null}
  </figure>
)
