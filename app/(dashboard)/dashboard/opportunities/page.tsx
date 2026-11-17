import { listOpportunities } from '@/lib/content/queries'
import { requireOfficer } from '@/lib/dashboard/dal'

import { OpportunitiesView } from '../content/views'

export const metadata = { title: 'Opportunities' }

export default async function DashboardOpportunitiesPage() {
  await requireOfficer()
  return <OpportunitiesView rows={await listOpportunities()} />
}
