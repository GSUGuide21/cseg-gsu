import { requireOfficer } from '@/lib/dashboard/dal'
import { listResources } from '@/lib/dashboard/queries'

import { ResourcesView } from './ResourcesView'

export const metadata = { title: 'Resources' }

export default async function DashboardResourcesPage() {
  await requireOfficer()
  return <ResourcesView {...await listResources()} />
}
