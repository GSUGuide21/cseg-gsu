import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

import { ContentDemo } from './ContentDemo'

export const metadata: Metadata = {
  title: 'Content layers',
  robots: { index: false, follow: false },
}

/**
 * The dashboard's screens for polls and quizzes, forms, and opportunities with samples, and
 * a quiz and a form as the site shows them, to look at and try without signing in or a
 * database. Only served by `next dev`.
 */
export default function ContentDemoPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return (
    <div className={cn(pageShell, 'max-w-6xl')}>
      <ContentDemo />
    </div>
  )
}
