/**
 * The site's own pages that officers can take over from the dashboard: a page there with
 * one of these addresses, once published, is what shows at the page's own path (/about
 * rather than /about-2). Until then, the page in the code shows. The parts only the site can
 * draw stay either way: Events keeps its lists, Executives its directory, and the Map stays
 * on top with the page's writing under it.
 */
export const SITE_PAGES = {
  about: { path: '/about', eyebrow: 'About' },
  join: { path: '/join', eyebrow: 'Join' },
  contact: { path: '/contact', eyebrow: 'Contact' },
  resources: { path: '/resources', eyebrow: 'Resources' },
  eat: { path: '/eat', eyebrow: 'Food' },
  constitution: { path: '/constitution', eyebrow: 'About' },
  events: { path: '/events', eyebrow: 'Events' },
  executives: { path: '/executives', eyebrow: 'About' },
  map: { path: '/map', eyebrow: 'Map' },
} as const

export type SitePageSlug = keyof typeof SITE_PAGES

export const isSitePage = (slug: string): slug is SitePageSlug => Object.hasOwn(SITE_PAGES, slug)

/**
 * Addresses the site already uses for something else, which a page can't take: a page
 * officers write shows at /its-address, so one named "posts" would never be reached.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'pages',
  'posts',
  'search',
  'affiliates',
  'dashboard',
  'login',
  'auth',
  'dev',
  'jeopardy',
  'api',
  'og',
  'feed',
  'assets',
  'vendor',
  'robots',
  'sitemap',
  'home',
  'index',
])

export const isReservedSlug = (slug: string) => RESERVED_SLUGS.has(slug)

/**
 * Where a dashboard page shows on the site: a site page's own path, /its-address, or
 * /parent/its-address for one that sits under another. (Left without the parent, the
 * short address still gets there: the site forwards it to the full one.)
 */
export const pageHref = (slug: string, parentSlug?: string | null): string => (isSitePage(slug) ? SITE_PAGES[slug].path : parentSlug ? `${pageHref(parentSlug)}/${slug}` : `/${slug}`)
