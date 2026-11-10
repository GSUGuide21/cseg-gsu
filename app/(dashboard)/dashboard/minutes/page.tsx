import { requireStaff } from '@/lib/dashboard/dal'
import { listMinutes } from '@/lib/dashboard/queries'

import { MinutesView } from './MinutesView'

export const metadata = { title: 'Minutes' }

export default async function MinutesPage() {
  await requireStaff()
  return <MinutesView minutes={await listMinutes()} />
}
