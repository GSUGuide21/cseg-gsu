import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { ManagedPage, managedPageMetadata } from '@/globals/Page/ManagedPage'
import { getPageRedirect, getPublishedPage } from '@/lib/dashboard/public'
import { isSitePage, pageHref, SITE_PAGES } from '@/lib/sitePages'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPublishedPage((await params).slug)
  return page ? managedPageMetadata(page) : {}
}

/**
 * A page officers wrote in the dashboard; one of the site's own (about, join…) shows at its
 * own path, and an address a page used to have forwards to where it is now.
 */
export default async function CustomPage({ params }: Props) {
  const { slug } = await params
  if (isSitePage(slug)) permanentRedirect(SITE_PAGES[slug].path)
  const page = await getPublishedPage(slug)
  if (page) return <ManagedPage page={page} />
  const movedTo = await getPageRedirect(slug)
  if (movedTo) permanentRedirect(pageHref(movedTo))
  notFound()
}
