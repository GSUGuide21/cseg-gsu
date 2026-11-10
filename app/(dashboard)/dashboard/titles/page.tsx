import { requireOfficer } from '@/lib/dashboard/dal'
import { getPageMeta } from '@/lib/dashboard/queries'

import { TitlesView } from './TitlesView'

export const metadata = { title: 'Tab titles' }

export default async function DashboardTitlesPage() {
  await requireOfficer()
  const { rows, managed } = await getPageMeta()
  return <TitlesView rows={rows} managed={managed} />
}
