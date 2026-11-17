import { ClubDetailsProvider } from '@/globals/ClubDetails'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getClubDetails } from '@/lib/dashboard/public'
import { getHomepageRow } from '@/lib/dashboard/queries'

import { HomepageView } from './HomepageView'

export const metadata = { title: 'Homepage' }

export default async function DashboardHomepagePage() {
  await requireOfficer()
  const [row, details] = await Promise.all([getHomepageRow(), getClubDetails()])
  // The club's links, as Settings has them: for the Connect section's choices and the preview
  return (
    <ClubDetailsProvider details={details}>
      <HomepageView row={row} />
    </ClubDetailsProvider>
  )
}
