import { notFound } from 'next/navigation'

import { SiteContentProvider } from '@/globals/SiteContent'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteContent } from '@/lib/dashboard/public'
import { getPage } from '@/lib/dashboard/queries'

import { DocumentEditor } from '../../DocumentEditor'

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOfficer()
  const { id } = await params
  // Not a uuid: no such page (and Postgres would reject the lookup anyway)
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const doc = await getPage(id)
  if (!doc) notFound()
  return (
    <SiteContentProvider content={await getSiteContent()}>
      <DocumentEditor kind="page" doc={doc} />
    </SiteContentProvider>
  )
}
