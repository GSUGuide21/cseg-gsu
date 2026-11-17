import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

import { PresentationEditorDemo } from './PresentationEditorDemo'

export const metadata: Metadata = {
  title: 'Presentation editor',
  robots: { index: false, follow: false },
}

/**
 * The dashboard's presentation editor with a sample deck, to look at and try without
 * signing in. Nothing is saved. Only served by `next dev`.
 */
export default function PresentationEditorDemoPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return (
    <div className={cn(pageShell, 'max-w-7xl')}>
      <PresentationEditorDemo />
    </div>
  )
}
