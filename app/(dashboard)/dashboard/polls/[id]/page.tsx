import { notFound } from 'next/navigation'

import { getPollWithAnswers } from '@/lib/content/queries'
import { requireOfficer } from '@/lib/dashboard/dal'

import { PollResultsView } from '../../content/results'

export const metadata = { title: 'Results' }

export default async function PollResultsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOfficer()
  const found = await getPollWithAnswers((await params).id)
  if (!found) notFound()
  return <PollResultsView {...found} />
}
