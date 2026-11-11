'use client'

import { ErrorScreen } from '@/globals/ErrorScreen'

/** A site page that broke, shown between the site's own header and footer */
export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} />
}
