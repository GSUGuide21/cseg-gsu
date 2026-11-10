import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { requireStaff } from '@/lib/dashboard/dal'
import { getMemberProfile } from '@/lib/dashboard/queries'

import { MemberProfile } from './MemberProfile'

export const metadata: Metadata = { title: 'Member' }

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff()
  const { id } = await params
  const profile = await getMemberProfile(id)
  if (!profile) notFound()
  return <MemberProfile member={profile.member} history={profile.history} />
}
