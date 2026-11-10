import { requireOfficer } from '@/lib/dashboard/dal'
import { listSponsors } from '@/lib/dashboard/queries'

import { SponsorsView } from './SponsorsView'

export const metadata = { title: 'Sponsors' }

export default async function DashboardSponsorsPage() {
  await requireOfficer()
  return <SponsorsView sponsors={await listSponsors()} />
}
