import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { ManagedPage } from '@/globals/Page/ManagedPage'
import { getPublishedPage } from '@/lib/dashboard/public'
import { isSitePage, SITE_PAGES } from '@/lib/sitePages'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPublishedPage((await params).slug)
  return page ? { title: page.title, description: page.description ?? undefined } : {}
}

/** A page officers wrote in the dashboard; one of the site's own (about, join…) shows at its own path */
export default async function CustomPage({ params }: Props) {
  const { slug } = await params
  if (isSitePage(slug)) permanentRedirect(SITE_PAGES[slug].path)
  const page = await getPublishedPage(slug)
  if (!page) notFound()
  return <ManagedPage page={page} />
}
