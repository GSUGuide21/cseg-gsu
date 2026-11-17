import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Gallery } from '@/components'
import { inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getAlbum } from '@/lib/content/public'
import { formatDate } from '@/lib/dashboard/format'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const album = await getAlbum((await params).slug)
  if (!album) return { title: 'Album not found' }
  const cover = album.cover_url ?? album.photos[0]?.src
  return { title: album.title, description: album.description ?? undefined, openGraph: { title: album.title, description: album.description ?? undefined, images: cover ? [cover] : undefined } }
}

/** An album: what it's of, then its photos, each opening larger */
export default async function AlbumPage({ params }: Props) {
  const album = await getAlbum((await params).slug)
  if (!album) notFound()
  return (
    <article className={cn(pageShell, 'gap-6')}>
      <header className="flex flex-col gap-3">
        <Link href="/albums" className={cn(inlineLink, 'text-[0.9rem]')}>
          ← All albums
        </Link>
        <h1 className="m-0 text-[clamp(1.8rem,4.5vw,2.75rem)] leading-[1.1] font-extrabold tracking-tight text-balance text-ink">{album.title}</h1>
        {album.description ? <p className="m-0 max-w-3xl text-[clamp(1rem,1.6vw,1.15rem)] leading-[1.7] text-muted">{album.description}</p> : null}
        <p className="m-0 text-[0.9rem] text-muted">
          {album.taken_on ? `${formatDate(album.taken_on)} · ` : ''}
          {album.photos.length} {album.photos.length === 1 ? 'photo' : 'photos'}
        </p>
      </header>
      {album.photos.length ? (
        <Gallery
          aria-label={`Photos from ${album.title}`}
          layout="masonry"
          images={album.photos.map((p, i) => ({ src: p.src, alt: p.alt || `Photo ${i + 1} from ${album.title}`, caption: p.caption || undefined }))}
        />
      ) : (
        <p className="m-0 text-muted">No photos yet.</p>
      )}
    </article>
  )
}
