import { notFound } from 'next/navigation'

import { getFormWithResponses } from '@/lib/content/queries'
import { requireOfficer } from '@/lib/dashboard/dal'

import { FormResponsesView } from '../../content/results'

export const metadata = { title: 'Responses' }

export default async function FormResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOfficer()
  const found = await getFormWithResponses((await params).id)
  if (!found) notFound()
  return <FormResponsesView {...found} />
}
