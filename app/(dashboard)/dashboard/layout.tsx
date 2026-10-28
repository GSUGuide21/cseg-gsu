import type { ReactNode } from 'react'

import { requireOfficer, getAccess } from '@/lib/dashboard/dal'

import { DashboardShell } from './DashboardShell'

/**
 * The dashboard's frame: sidebar, search, and account menu. It reads the officer for the
 * account menu; each page still checks access itself (a layout doesn't re-run on every
 * navigation, so it can't be the only guard).
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { officer } = await requireOfficer()
  const access = await getAccess()
  const avatarUrl = access.state === 'officer' ? access.avatarUrl : null
  return (
    <DashboardShell officer={{ email: officer.email, name: officer.name, title: officer.title, role: officer.role }} avatarUrl={avatarUrl}>
      {children}
    </DashboardShell>
  )
}
