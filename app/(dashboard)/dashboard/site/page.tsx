import { redirect } from 'next/navigation'

/** The section has no screen of its own; its first part stands in */
export default function DashboardSitePage() {
  redirect('/dashboard/site/navigation')
}
