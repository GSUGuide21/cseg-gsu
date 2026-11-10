import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

import { PageEditorDemo } from './PageEditorDemo'

export const metadata: Metadata = {
  title: 'Page editor',
  robots: { index: false, follow: false },
}

/**
 * The dashboard's page editor with a sample page in sections, to look at and try without
 * signing in. Nothing is saved. Only served by `next dev`.
 */
export default function PageEditorDemoPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return (
    <div className={cn(pageShell, 'max-w-7xl')}>
      <PageEditorDemo />
    </div>
  )
}
