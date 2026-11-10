import { requireOfficer } from '@/lib/dashboard/dal'
import { listAffiliates } from '@/lib/dashboard/queries'

import { AffiliatesView } from './AffiliatesView'

export const metadata = { title: 'Affiliates' }

export default async function DashboardAffiliatesPage() {
  await requireOfficer()
  return <AffiliatesView affiliates={await listAffiliates()} />
}
