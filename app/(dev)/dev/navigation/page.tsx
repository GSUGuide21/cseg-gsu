import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

import { NavigationDemo } from './NavigationDemo'

export const metadata: Metadata = {
  title: 'Navigation editor',
  robots: { index: false, follow: false },
}

/**
 * The dashboard's Navigation screen with the built-in menus, to look at and try without
 * signing in. Saving goes to the real server action, which asks for an officer. Only served
 * by `next dev`.
 */
export default function NavigationDemoPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return (
    <div className={cn(pageShell, 'max-w-7xl')}>
      <NavigationDemo />
    </div>
  )
}
