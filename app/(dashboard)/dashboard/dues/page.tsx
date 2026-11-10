import { requireStaff } from '@/lib/dashboard/dal'
import { listDues } from '@/lib/dashboard/queries'

import { DuesView } from './DuesView'

export const metadata = { title: 'Dues' }

export default async function DuesPage() {
  const { officer } = await requireStaff()
  return <DuesView {...await listDues()} isAdmin={officer.role === 'admin'} />
}
