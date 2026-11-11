'use client'

import { ErrorScreen } from '@/globals/ErrorScreen'

/**
 * The fallback for everything without an error page of its own: signing in, the affiliate
 * pages, and a failure in the site's header or footer, which the site's own error page sits
 * inside and so can't catch.
 */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} className="min-h-screen" />
}
