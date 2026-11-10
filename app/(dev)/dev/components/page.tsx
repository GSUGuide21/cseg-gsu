import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/globals/Page'
import { inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

import { ComponentsDemo } from './ComponentsDemo'

export const metadata: Metadata = {
  title: 'Components',
  robots: { index: false, follow: false },
}

/**
 * Every component in app/components (forms have their own page), for checking looks and
 * behavior while building. Only served by `next dev`: Next sets NODE_ENV to "production"
 * for builds, so the live site answers this URL with a 404.
 */
export default function ComponentsDemoPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return (
    <div className={cn(pageShell, 'max-w-5xl gap-[clamp(2rem,4vw,3rem)]')}>
      <PageHeader
        eyebrow="Development only"
        title="Components"
        lead={
          <>
            Each component from app/components, in its states. Try them with the keyboard and in both themes. Form controls are on{' '}
            <Link href="/dev/forms" className={inlineLink}>
              their own page
            </Link>
            , and the{' '}
            <Link href="/dev/dashboard" className={inlineLink}>
              dashboard demo
            </Link>{' '}
            puts the data components together. This page isn’t served in production.
          </>
        }
      />
      <ComponentsDemo />
    </div>
  )
}
