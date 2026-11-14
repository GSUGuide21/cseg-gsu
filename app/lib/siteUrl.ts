/**
 * The site's public address, for what has to name it in full: the sitemap, the RSS feed, and
 * link previews. Set NEXT_PUBLIC_SITE_URL where the site is hosted; Vercel's own production
 * address stands in until then, and the club's own domain for any other production build.
 */
const configured = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)

/** Where the live site is served (the domain in cname.txt) */
export const PRODUCTION_URL = 'https://cseg-gsu.org'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

export const SITE_URL = (configured || (IS_PRODUCTION ? PRODUCTION_URL : 'http://localhost:3000')).replace(/\/+$/, '')

/** A path on the site, in full */
export const absoluteUrl = (path: string) => `${SITE_URL}${path}`

/**
 * A link between the site and its dashboard: in full on the live site's address in production
 * (so a build served from another host, Amplify's own domain say, still lands on the real
 * one), and the plain path while developing, to stay on localhost.
 */
export const siteHref = (path: string) => (IS_PRODUCTION ? absoluteUrl(path) : path)

/** A generated link-preview image, for a post or page with no image of its own */
export const previewImagePath = (kind: 'post' | 'page', slug: string) => `/og/${kind}/${slug}`
