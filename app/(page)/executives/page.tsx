import type { Metadata } from 'next'

import { PageHeader } from '@/globals/Page'
import { ManagedPage, managedPageMetadata } from '@/globals/Page/ManagedPage'
import { pageShell } from '@/globals/ui/styles'
import { getExecutives, getPublishedPage } from '@/lib/dashboard/public'
import { SITE_PAGES } from '@/lib/sitePages'

import { ExecutiveDirectory } from './components/ExecutiveDirectory'

export const revalidate = 60 // revalidate every 60 seconds

const OWN: Metadata = {
  title: 'Executives',
  description: 'Meet the executives of our organization.',
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage('executives')
  return page ? managedPageMetadata(page, OWN.description ?? undefined) : OWN
}

/**
 * The executives officers list in the dashboard, or the built-in list until there are any.
 * Around them: the page officers wrote for this address, once it's published, or the site's own.
 */
export default async function ExecutivesPage() {
  const [page, executives] = await Promise.all([getPublishedPage('executives'), getExecutives()])
  const directory = <ExecutiveDirectory executives={executives} />
  if (page) return <ManagedPage page={page} eyebrow={SITE_PAGES.executives.eyebrow} after={directory} />
  return (
    <div className={pageShell}>
      <PageHeader eyebrow="About" title="Executives" lead="Meet the students who lead CSEG." />
      {directory}
    </div>
  )
}
