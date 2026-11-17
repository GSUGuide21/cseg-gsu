import { listAlbums } from '@/lib/content/queries'
import { requireOfficer } from '@/lib/dashboard/dal'

import { AlbumsView } from '../content/views'

export const metadata = { title: 'Photo albums' }

export default async function DashboardAlbumsPage() {
  await requireOfficer()
  return <AlbumsView rows={await listAlbums()} />
}
