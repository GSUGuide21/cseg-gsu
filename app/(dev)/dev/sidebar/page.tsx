import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DashboardShell } from '../../../(dashboard)/dashboard/DashboardShell'

export const metadata: Metadata = {
  title: 'Dashboard sidebar',
  robots: { index: false, follow: false },
}

/**
 * The dashboard's frame (its sidebar, ⌘K search, New menu, and account menu) as an officer
 * sees it, with messages and requests waiting, to look at without signing in. `?role=editor`
 * shows an editor's. Only served by `next dev`.
 */
export default async function SidebarDemoPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const role = (await searchParams).role === 'editor' ? 'editor' : 'officer'
  return (
    <DashboardShell officer={{ email: 'jordan.lee@student.gsu.edu', name: 'Jordan Lee', title: 'President', role }} avatarUrl={null} unread={3} pending={2}>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[1.6rem] font-extrabold tracking-tight text-ink">The page goes here</h1>
        <p className="m-0 text-muted">This is a sample of the dashboard’s frame, signed in as an {role}.</p>
      </div>
    </DashboardShell>
  )
}
