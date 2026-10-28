import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/globals/Page'
import { inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

import { DashboardDemo } from './DashboardDemo'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
}

/**
 * The dashboard components working together on made-up club data: tabs, filters, stats,
 * charts, a table with row actions, a stepper, and an activity timeline. Only served by
 * `next dev`; the live site answers this URL with a 404.
 */
export default function DashboardDemoPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return (
    <div className={cn(pageShell, 'max-w-6xl gap-[clamp(2rem,4vw,3rem)]')}>
      <PageHeader
        eyebrow="Development only"
        title="Dashboard"
        lead={
          <>
            The dashboard components together, on made-up data. Each tab’s filters drive everything under them. The rest of the components are on{' '}
            <Link href="/dev/components" className={inlineLink}>
              the components page
            </Link>
            . This page isn’t served in production.
          </>
        }
      />
      <DashboardDemo />
    </div>
  )
}
