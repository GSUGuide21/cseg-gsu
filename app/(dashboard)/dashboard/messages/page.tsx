import { requireStaff } from '@/lib/dashboard/dal'
import { listMessages } from '@/lib/dashboard/queries'

import { MessagesView } from './MessagesView'

export const metadata = { title: 'Messages' }

export default async function DashboardMessagesPage() {
  await requireStaff()
  return <MessagesView messages={await listMessages()} />
}
