import { requireStaff } from '@/lib/dashboard/dal'
import { currentTermDues, listMemberAttendance, listMembers } from '@/lib/dashboard/queries'

import { MembersView } from './MembersView'

export const metadata = { title: 'Members' }

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  await requireStaff()
  const [members, attendance, dues, { add }] = await Promise.all([listMembers(), listMemberAttendance(), currentTermDues(), searchParams])
  return <MembersView members={members} attendance={attendance} dues={dues} startAdding={add === '1'} />
}
