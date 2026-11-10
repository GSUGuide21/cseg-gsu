import { requireOfficer } from '@/lib/dashboard/dal'
import { listConnections } from '@/lib/dashboard/queries'

import { ConnectionsView } from './ConnectionsView'

export const metadata = { title: 'Skybridges & shortcuts' }

export default async function DashboardConnectionsPage() {
  await requireOfficer()
  return <ConnectionsView connections={await listConnections()} />
}
