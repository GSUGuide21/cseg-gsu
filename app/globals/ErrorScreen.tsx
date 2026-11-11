'use client'

import { RotateCcw, TriangleAlert } from 'lucide-react'
import { useEffect, type FC } from 'react'

import { Button, EmptyState } from '@/components'
import { cn } from '@/lib/cn'

export type ErrorScreenProps = {
  /** Whatever was thrown: an Error from the server, anything at all from the browser */
  error: unknown
  /** Loads the failed part of the page again */
  retry: () => void
  /** Where to go instead when trying again doesn't help */
  home?: { href: string; label: string }
  className?: string
}

/** The code Next gives a server error, which matches a line in the server's logs */
export const errorCode = (error: unknown): string | null => {
  const digest = error instanceof Error ? (error as Error & { digest?: unknown }).digest : null
  return typeof digest === 'string' && digest ? digest : null
}

/**
 * What a page shows when it breaks: that it broke, a way to try again, and a way out. The
 * error's own message stays out of sight (it can hold details visitors shouldn't see); the
 * code under the buttons is what to pass along when reporting it.
 */
export const ErrorScreen: FC<ErrorScreenProps> = ({ error, retry, home = { href: '/', label: 'Back to home' }, className }) => {
  useEffect(() => {
    console.error(error)
  }, [error])

  const code = errorCode(error)
  return (
    <div role="alert" className={cn('grid min-h-[60vh] place-items-center px-4 py-12', className)}>
      <div className="flex flex-col items-center gap-2">
        <EmptyState
          icon={<TriangleAlert />}
          headingLevel={1}
          title="Something went wrong"
          description="This page ran into a problem on our end. Trying again often fixes it; if it keeps happening, let the officers know."
          actions={
            <>
              <Button onClick={() => retry()} leading={<RotateCcw size={16} aria-hidden />}>
                Try again
              </Button>
              <Button href={home.href} variant="outline">
                {home.label}
              </Button>
            </>
          }
        />
        {code ? (
          <p className="m-0 text-[0.8rem] text-muted">
            Error code: <code className="font-mono">{code}</code>
          </p>
        ) : null}
      </div>
    </div>
  )
}
