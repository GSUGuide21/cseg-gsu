import { listPolls } from '@/lib/content/queries'
import { requireOfficer } from '@/lib/dashboard/dal'

import { PollsView } from '../content/views'

export const metadata = { title: 'Polls and quizzes' }

export default async function DashboardPollsPage() {
  await requireOfficer()
  return <PollsView rows={await listPolls()} />
}
