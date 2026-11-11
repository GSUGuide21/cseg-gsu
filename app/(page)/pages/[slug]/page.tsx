import { notFound, permanentRedirect } from 'next/navigation'

import { getPageAt, getPageRedirect } from '@/lib/dashboard/public'
import { isSitePage, pageHref, SITE_PAGES } from '@/lib/sitePages'

export const revalidate = 300

/**
 * Where pages officers wrote used to live (/pages/guide). They're at /guide now, so this
 * only forwards: to the page's address today, to a site page's own path, or, for an address
 * a page used to have, to where that page is now.
 */
export default async function OldPageAddress({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (isSitePage(slug)) permanentRedirect(SITE_PAGES[slug].path)
  const found = await getPageAt([slug])
  if (found) permanentRedirect(found.href)
  const movedTo = await getPageRedirect(slug)
  if (movedTo) permanentRedirect(pageHref(movedTo))
  notFound()
}
