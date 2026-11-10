import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'

import { SITE_NAME } from '@/globals/config/site'
import { getPublishedPage, getPublishedPost } from '@/lib/dashboard/public'
import { postCategoryLabel } from '@/lib/supabase/types'

type Props = { params: Promise<{ kind: string; slug: string }> }

/**
 * A link preview for a post or page with no image of its own: its title on Georgia State blue.
 * It's a route rather than an opengraph-image file because those replace a metadata image,
 * and a post's own cover has to win. Only published posts and pages have one.
 */
export async function GET(_request: Request, { params }: Props) {
  const { kind, slug } = await params
  const doc = kind === 'post' ? await getPublishedPost(slug) : kind === 'page' ? await getPublishedPage(slug) : null
  if (!doc) return new Response('No such post or page', { status: 404 })
  const label = 'category' in doc ? postCategoryLabel(doc.category) : null

  const logo = await readFile(join(process.cwd(), 'public/assets/logos/logo-wbl.png'))
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, color: 'white', backgroundImage: 'linear-gradient(135deg, #0039a6 55%, #1f5fd6)' }}>
      <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{label ?? (kind === 'post' ? 'News' : 'CSEG')}</div>
      <div style={{ display: 'flex', fontSize: doc.title.length > 60 ? 62 : 80, fontWeight: 800, lineHeight: 1.1 }}>{doc.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 32 }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- drawn to a PNG, not a page */}
        <img src={`data:image/png;base64,${logo.toString('base64')}`} width={84} height={84} style={{ borderRadius: 42 }} />
        {SITE_NAME}
      </div>
    </div>,
    { headers: { 'Cache-Control': 'public, max-age=3600' } }
  )
}
