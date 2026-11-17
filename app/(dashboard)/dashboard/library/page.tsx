import { listDocuments } from '@/lib/content/queries'
import { requireOfficer } from '@/lib/dashboard/dal'

import { LibraryView } from '../content/views'

export const metadata = { title: 'Library' }

export default async function DashboardLibraryPage() {
  await requireOfficer()
  return <LibraryView rows={await listDocuments()} />
}
