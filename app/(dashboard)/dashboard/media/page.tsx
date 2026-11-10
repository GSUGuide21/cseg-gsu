import { requireOfficer } from '@/lib/dashboard/dal'
import { getMediaUsage } from '@/lib/dashboard/queries'

import { MediaView } from './MediaView'

export const metadata = { title: 'Media' }

export default async function MediaPage() {
  await requireOfficer()
  return <MediaView usage={await getMediaUsage()} />
}
