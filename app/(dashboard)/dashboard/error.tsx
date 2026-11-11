'use client'

import { ErrorScreen } from '@/globals/ErrorScreen'

/** A dashboard screen that broke; the sidebar stays, so the rest of the dashboard is a click away */
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} home={{ href: '/dashboard', label: 'Back to overview' }} className="min-h-[50vh]" />
}
