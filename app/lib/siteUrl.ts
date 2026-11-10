/**
 * The site's public address, for what has to name it in full: the sitemap, the RSS feed, and
 * link previews. Set NEXT_PUBLIC_SITE_URL where the site is hosted; Vercel's own production
 * address stands in until then.
 */
const configured = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)

export const SITE_URL = (configured || 'http://localhost:3000').replace(/\/+$/, '')

/** A path on the site, in full */
export const absoluteUrl = (path: string) => `${SITE_URL}${path}`

/** A generated link-preview image, for a post or page with no image of its own */
export const previewImagePath = (kind: 'post' | 'page', slug: string) => `/og/${kind}/${slug}`
