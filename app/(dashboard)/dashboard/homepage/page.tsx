import { requireOfficer } from '@/lib/dashboard/dal'
import { getHomepageRow } from '@/lib/dashboard/queries'

import { HomepageView } from './HomepageView'

export const metadata = { title: 'Homepage' }

export default async function DashboardHomepagePage() {
  await requireOfficer()
  return <HomepageView row={await getHomepageRow()} />
}
