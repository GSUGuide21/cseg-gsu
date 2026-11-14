import { notFound } from 'next/navigation'

import { requireOfficer } from '@/lib/dashboard/dal'
import { getPresentation } from '@/lib/dashboard/queries'

import { PresentationEditor } from '../PresentationEditor'

export const metadata = { title: 'Edit presentation' }

export default async function EditPresentationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOfficer()
  const { id } = await params
  // Not a uuid: no such presentation (and Postgres would reject the lookup anyway)
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const doc = await getPresentation(id)
  if (!doc) notFound()
  return <PresentationEditor doc={doc} />
}
