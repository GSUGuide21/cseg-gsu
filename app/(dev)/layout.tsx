import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import SiteLayout from '../(page)/layout'

/**
 * Pages for checking how things look while building, in the site's own header and footer.
 * Only served by `next dev`: Next sets NODE_ENV to "production" for builds, so the live
 * site answers every URL in this group with a 404.
 */
export default function DevLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== 'development') notFound()

  return <SiteLayout>{children}</SiteLayout>
}
