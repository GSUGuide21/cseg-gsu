import type { Metadata } from 'next'
import { notFound, permanentRedirect, redirect } from 'next/navigation'

import { ManagedPage, managedPageMetadata } from '@/globals/Page/ManagedPage'
import { getPageAt, getPageFamily, getPageRedirect, getRedirect } from '@/lib/dashboard/public'
import { redirectPathFrom } from '@/lib/dashboard/validate'
import { isSitePage, pageHref } from '@/lib/sitePages'

// A page or redirect added or changed in the dashboard refreshes this sooner
export const revalidate = 300

type Props = { params: Promise<{ path: string[] }> }

/** A missing file (an image, a script) is just missing; only page addresses are looked up */
const isFile = (path: string) => /\.[a-z0-9]+$/.test(path)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params
  if (isFile(path.join('/'))) return {}
  const found = await getPageAt(path)
  return found ? managedPageMetadata(found.page) : {}
}

/**
 * Any address the site has no page of its own for. In order: a page officers wrote in the
 * dashboard (/guides, or /guides/parking for one that sits under another); an address a
 * page used to have, which forwards to where it is now; an address officers forwarded from
 * the dashboard's Redirects (a temporary redirect, so changing it later takes); and
 * otherwise it's not found, in the site's own header and footer.
 */
export default async function AnyAddress({ params }: Props) {
  const segments = (await params).path
  const path = redirectPathFrom(`/${segments.join('/')}`)
  if (isFile(path)) notFound()

  const found = await getPageAt(segments)
  if (found) {
    // One address per page: a site page's own path, and /parent/page for one under another
    if (found.href !== `/${segments.join('/')}`) permanentRedirect(found.href)
    return <ManagedPage page={found.page} {...await getPageFamily(found.page)} />
  }

  const last = segments[segments.length - 1]
  if (segments.length <= 2 && !isSitePage(last)) {
    const movedTo = await getPageRedirect(last)
    if (movedTo) permanentRedirect(pageHref(movedTo))
  }

  const to = await getRedirect(path)
  if (to) redirect(to)
  notFound()
}
