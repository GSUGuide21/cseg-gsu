import { notFound } from 'next/navigation'

import { SiteContentProvider } from '@/globals/SiteContent'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteContent } from '@/lib/dashboard/public'
import { getPost } from '@/lib/dashboard/queries'

import { DocumentEditor } from '../../DocumentEditor'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOfficer()
  const { id } = await params
  // Not a uuid: no such post (and Postgres would reject the lookup anyway)
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const doc = await getPost(id)
  if (!doc) notFound()
  return (
    <SiteContentProvider content={await getSiteContent()}>
      <DocumentEditor kind="post" doc={doc} />
    </SiteContentProvider>
  )
}
