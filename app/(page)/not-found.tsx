import { Compass } from 'lucide-react'
import type { Metadata } from 'next'

import { Button, EmptyState } from '@/components'

export const metadata: Metadata = { title: 'Page not found' }

/** An address no page answers, shown between the site's own header and footer */
export default function SiteNotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-12">
      <EmptyState
        icon={<Compass />}
        headingLevel={1}
        title="We couldn’t find that page"
        description="It may have moved, or the link may be mistyped. Search the site, or start again from the home page."
        actions={
          <>
            <Button href="/">Back to home</Button>
            <Button href="/search" variant="outline">
              Search the site
            </Button>
          </>
        }
      />
    </div>
  )
}
