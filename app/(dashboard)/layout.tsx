import type { Metadata } from 'next'
import type { CSSProperties, ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Dashboard',
  // Officer-only screens; nothing here belongs in search results
  robots: { index: false, follow: false },
}

/**
 * The officer screens (/login, /dashboard). They don't use the site's header, so the
 * header height is zero here: sticky parts like the dashboard sidebar sit at the top.
 */
export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface" style={{ '--header-height': '0px' } as CSSProperties}>
      {children}
    </div>
  )
}
