'use client'

import { useEffect, useState } from 'react'

import { THEME_STORAGE_KEY } from '@/globals/config/theme'
import { errorCode } from '@/globals/ErrorScreen'

import './globals.css'

/**
 * The last resort: the root layout itself failed, so this replaces it, <html> and all. It
 * leans on as little as it can of what might have broken (no fonts, no components), and
 * reads the visitor's saved light or dark choice itself, since the layout that normally
 * applies it is gone.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const [dark, setDark] = useState(false)
  useEffect(() => {
    try {
      setDark(localStorage.getItem(THEME_STORAGE_KEY) === 'dark')
    } catch {
      // Storage is blocked: stay light, as the site itself would
    }
  }, [])

  const code = errorCode(error)
  return (
    <html lang="en" className={dark ? 'dark' : undefined}>
      <body className="bg-surface font-sans text-ink antialiased">
        <title>Something went wrong | Campus Survival and Engagement Group</title>
        <main role="alert" className="mx-auto grid min-h-screen max-w-md place-items-center px-6 py-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <h1 className="m-0 text-2xl font-bold">Something went wrong</h1>
            <p className="m-0 text-[0.95rem] text-muted">The site ran into a problem on our end. Trying again often fixes it.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => retry()} className="cursor-pointer rounded-full bg-brand-solid px-5 py-2.5 text-[0.95rem] font-semibold text-white hover:bg-brand-solid-hover">
                Try again
              </button>
              {/* A full page load, on purpose: the app that would handle a soft navigation is what failed */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="rounded-full border border-line px-5 py-2.5 text-[0.95rem] font-semibold text-ink no-underline hover:bg-brand-tint">
                Back to home
              </a>
            </div>
            {code ? (
              <p className="m-0 text-[0.8rem] text-muted">
                Error code: <code className="font-mono">{code}</code>
              </p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  )
}
