import { requireOfficer } from '@/lib/dashboard/dal'
import { listEateries } from '@/lib/dashboard/queries'

import { EateriesView } from './EateriesView'

export const metadata = { title: 'Eateries' }

export default async function DashboardEateriesPage() {
  await requireOfficer()
  return <EateriesView eateries={await listEateries()} />
}
