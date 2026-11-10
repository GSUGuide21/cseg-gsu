import { requireOfficer } from '@/lib/dashboard/dal'
import { listExecutives } from '@/lib/dashboard/queries'

import { ExecutivesView } from './ExecutivesView'

export const metadata = { title: 'Executives' }

export default async function DashboardExecutivesPage() {
  await requireOfficer()
  return <ExecutivesView executives={await listExecutives()} />
}
