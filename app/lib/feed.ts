import { CLUB_DESCRIPTION, SITE_NAME } from '@/globals/config/site'

import { absoluteUrl } from './siteUrl'

export interface FeedPost {
  slug: string
  title: string
  excerpt: string | null
  published_at: string | null
  author_name?: string | null
  category?: string | null
}

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

// Control characters aren't allowed in XML at all, so they go rather than break the whole feed
const xml = (text: string) => escapeXml(text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''))

/** Published posts, newest first, as an RSS 2.0 document */
export const rssFeed = (posts: readonly FeedPost[]) => {
  const items = posts.map((p) => {
    const link = xml(absoluteUrl(`/posts/${p.slug}`))
    return [
      '    <item>',
      `      <title>${xml(p.title)}</title>`,
      `      <link>${link}</link>`,
      `      <guid isPermaLink="true">${link}</guid>`,
      p.published_at ? `      <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : null,
      p.excerpt ? `      <description>${xml(p.excerpt)}</description>` : null,
      p.author_name ? `      <dc:creator>${xml(p.author_name)}</dc:creator>` : null,
      p.category ? `      <category>${xml(p.category)}</category>` : null,
      '    </item>',
    ]
      .filter(Boolean)
      .join('\n')
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${xml(SITE_NAME)}</title>`,
    `    <link>${xml(absoluteUrl('/posts'))}</link>`,
    `    <description>${xml(CLUB_DESCRIPTION.tagline)}</description>`,
    '    <language>en-us</language>',
    `    <atom:link href="${xml(absoluteUrl('/feed.xml'))}" rel="self" type="application/rss+xml" />`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}
