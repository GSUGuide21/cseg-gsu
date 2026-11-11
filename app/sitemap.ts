import type { MetadataRoute } from 'next'

import { getAffiliates, getPublishedPageList, getPublishedPosts } from '@/lib/dashboard/public'
import { affiliateHref } from '@/lib/data/affiliates'
import { absoluteUrl } from '@/lib/siteUrl'
import { SITE_PAGES } from '@/lib/sitePages'

// New posts and pages show up within five minutes, as they do on the site
export const revalidate = 300

const ROUTES = ['/', ...Object.values(SITE_PAGES).map((p) => p.path), '/posts', '/affiliates']

/** Every public page, for search engines. A page that takes over a site page replaces its entry. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, pages, affiliates] = await Promise.all([getPublishedPosts(), getPublishedPageList(), getAffiliates()])
  const entries = new Map<string, Date | undefined>([...ROUTES, ...affiliates.map(affiliateHref)].map((path) => [path, undefined]))
  for (const p of pages) entries.set(p.href, new Date(p.updated_at))
  for (const p of posts) entries.set(`/posts/${p.slug}`, new Date(p.updated_at))
  return [...entries].map(([path, lastModified]) => ({ url: absoluteUrl(path), lastModified }))
}
