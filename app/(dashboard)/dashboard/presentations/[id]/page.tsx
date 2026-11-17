import { notFound } from 'next/navigation'

import { SiteContentProvider } from '@/globals/SiteContent'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteContent } from '@/lib/dashboard/public'
import { getPresentation, getPresentationNotes } from '@/lib/dashboard/queries'

import { PresentationEditor } from '../PresentationEditor'

export const metadata = { title: 'Edit presentation' }

export default async function EditPresentationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOfficer()
  const { id } = await params
  // Not a uuid: no such presentation (and Postgres would reject the lookup anyway)
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [doc, notes] = await Promise.all([getPresentation(id), getPresentationNotes(id)])
  if (!doc) notFound()
  return (
    <SiteContentProvider content={await getSiteContent()}>
      <PresentationEditor doc={doc} notes={notes} />
    </SiteContentProvider>
  )
}
