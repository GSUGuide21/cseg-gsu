/* eslint-disable @next/next/no-img-element -- YouTube's own thumbnail, at its own size */
import { Play } from 'lucide-react'
import type { FC } from 'react'

import { cn } from '@/lib/cn'

import { textOf } from './inline'

/**
 * A YouTube or Vimeo video, from its link. Only the video's id is kept, and it plays from
 * each site's privacy-minded player (youtube-nocookie.com, Vimeo with do-not-track), so no
 * other address can end up in the page.
 */

export type VideoProvider = 'youtube' | 'vimeo'

export interface VideoData {
  provider: VideoProvider | ''
  id: string
  title: string
}

export const VIDEO_TITLE_MAX = 150

const YOUTUBE_ID = /^[\w-]{11}$/
const VIMEO_ID = /^\d{1,12}$/

/** A pasted link: youtube.com/watch?v=…, youtu.be/…, /shorts/…, /embed/…, /live/…, or vimeo.com/… */
export const videoFromUrl = (typed: string): { provider: VideoProvider; id: string } | null => {
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(typed.trim()) ? typed.trim() : `https://${typed.trim()}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '')
  const parts = url.pathname.split('/').filter(Boolean)
  if (host === 'youtu.be') return YOUTUBE_ID.test(parts[0] ?? '') ? { provider: 'youtube', id: parts[0] } : null
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = url.searchParams.get('v') ?? (['shorts', 'embed', 'live', 'v'].includes(parts[0]) ? parts[1] : undefined)
    return id && YOUTUBE_ID.test(id) ? { provider: 'youtube', id } : null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parts.find((p) => VIMEO_ID.test(p))
    return id ? { provider: 'vimeo', id } : null
  }
  return null
}

export const parseProvider = (value: unknown): VideoProvider | '' => (value === 'youtube' || value === 'vimeo' ? value : '')
export const parseVideoId = (value: unknown) => (typeof value === 'string' && (YOUTUBE_ID.test(value) || VIMEO_ID.test(value)) ? value : '')
export const parseVideoTitle = (value: unknown) => textOf(value, VIDEO_TITLE_MAX)

/** A saved video, if it's a whole one: a known site, and an id in that site's shape */
export const parseVideo = (raw: { provider?: unknown; id?: unknown; title?: unknown }): VideoData | null => {
  const provider = parseProvider(raw.provider)
  const id = parseVideoId(raw.id)
  if (!provider || !id || !(provider === 'youtube' ? YOUTUBE_ID : VIMEO_ID).test(id)) return null
  return { provider, id, title: parseVideoTitle(raw.title) }
}

export const embedSrc = ({ provider, id }: { provider: VideoProvider; id: string }) =>
  provider === 'youtube' ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : `https://player.vimeo.com/video/${id}?dnt=1`

/** The link to watch it on its own site */
export const watchUrl = ({ provider, id }: { provider: VideoProvider; id: string }) => (provider === 'youtube' ? `https://www.youtube.com/watch?v=${id}` : `https://vimeo.com/${id}`)

/**
 * The player, or (in the editor, `preview`) a still with a play button, so a click selects
 * the block rather than starting the video
 */
export const Video: FC<{ video: VideoData & { provider: VideoProvider }; preview?: boolean }> = ({ video, preview = false }) => (
  <figure className="my-5">
    <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-black">
      {preview ? (
        <>
          {video.provider === 'youtube' ? <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" className="size-full object-cover opacity-90" /> : null}
          <span className="absolute inset-0 grid place-items-center">
            <span className={cn('grid size-14 place-items-center rounded-full text-white', video.provider === 'youtube' ? 'bg-[#ff0000]' : 'bg-[#1ab7ea]')}>
              <Play size={24} fill="currentColor" aria-hidden />
            </span>
          </span>
        </>
      ) : (
        <iframe
          src={embedSrc(video)}
          title={video.title || 'Video'}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          className="size-full border-0"
        />
      )}
    </div>
    {video.title ? <figcaption className="mt-2 text-center text-[0.85rem] leading-snug text-muted">{video.title}</figcaption> : null}
  </figure>
)
