import { requireOfficer } from '@/lib/dashboard/dal'
import { listMembers } from '@/lib/dashboard/queries'

import { MembersView } from './MembersView'

export const metadata = { title: 'Members' }

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  await requireOfficer()
  const [members, { add }] = await Promise.all([listMembers(), searchParams])
  return <MembersView members={members} startAdding={add === '1'} />
}
