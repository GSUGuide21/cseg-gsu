import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

import { PostEditorDemo } from './PostEditorDemo'

export const metadata: Metadata = {
  title: 'Post editor',
  robots: { index: false, follow: false },
}

/**
 * The dashboard's post editor with a sample post, to look at and try without signing in.
 * Saving goes to the real server actions, which ask for an officer, so it sends you to
 * /login. Only served by `next dev`.
 */
export default function PostEditorDemoPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return (
    <div className={cn(pageShell, 'max-w-7xl')}>
      <PostEditorDemo />
    </div>
  )
}
