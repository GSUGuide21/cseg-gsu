import { notFound } from 'next/navigation'

import { SiteContentProvider } from '@/globals/SiteContent'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteContent } from '@/lib/dashboard/public'
import { getPage, listPageTree } from '@/lib/dashboard/queries'

import { DocumentEditor } from '../../DocumentEditor'

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOfficer()
  const { id } = await params
  // Not a uuid: no such page (and Postgres would reject the lookup anyway)
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [doc, pages] = await Promise.all([getPage(id), listPageTree()])
  if (!doc) notFound()
  return (
    <SiteContentProvider content={await getSiteContent()}>
      {/* Keyed by the last save, so a restored version opens fresh */}
      <DocumentEditor key={doc.updated_at} kind="page" doc={doc} pages={pages} />
    </SiteContentProvider>
  )
}
