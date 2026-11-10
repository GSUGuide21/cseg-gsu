import { requireStaff } from '@/lib/dashboard/dal'
import { listJoinRequests } from '@/lib/dashboard/queries'

import { RequestsView } from './RequestsView'

export const metadata = { title: 'Join requests' }

export default async function JoinRequestsPage() {
  await requireStaff()
  return <RequestsView requests={await listJoinRequests()} />
}
