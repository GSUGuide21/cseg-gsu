import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/globals/Page'
import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

import { FormsDemo } from './FormsDemo'

export const metadata: Metadata = {
  title: 'Form components',
  robots: { index: false, follow: false },
}

/**
 * Every form component in app/components/Form, for checking looks and behavior while
 * building. Only served by `next dev`: Next sets NODE_ENV to "production" for builds, so
 * the live site answers this URL with a 404.
 */
export default function FormsDemoPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return (
    <div className={cn(pageShell, 'max-w-5xl gap-[clamp(2rem,4vw,3rem)]')}>
      <PageHeader
        eyebrow="Development only"
        title="Form components"
        lead="Each component from app/components/Form with its live value. Try them with the keyboard and in both themes. This page isn’t served in production."
      />
      <FormsDemo />
    </div>
  )
}
