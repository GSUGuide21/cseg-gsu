/**
 * The site's own pages that officers can take over from the dashboard: a page there with
 * one of these addresses, once published, is what shows at the page's own path (/about
 * rather than /pages/about). Until then, the page in the code shows.
 */
export const SITE_PAGES = {
  about: { path: '/about', eyebrow: 'About' },
  join: { path: '/join', eyebrow: 'Join' },
  contact: { path: '/contact', eyebrow: 'Contact' },
  resources: { path: '/resources', eyebrow: 'Resources' },
  eat: { path: '/eat', eyebrow: 'Food' },
} as const

export type SitePageSlug = keyof typeof SITE_PAGES

export const isSitePage = (slug: string): slug is SitePageSlug => Object.hasOwn(SITE_PAGES, slug)

/** Where a dashboard page shows on the site */
export const pageHref = (slug: string) => (isSitePage(slug) ? SITE_PAGES[slug].path : `/pages/${slug}`)
