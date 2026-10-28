import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Alert } from '@/components'
import { getAccess } from '@/lib/dashboard/dal'
import { safeNext } from '@/lib/dashboard/validate'
import { LogoMark } from '@/globals/Logo'
import { inlineLink } from '@/globals/ui/styles'

import { GoogleButton } from './GoogleButton'

export const metadata: Metadata = { title: 'Sign in' }

const ERRORS: Record<string, string> = {
  'not-officer': 'That account isn’t on the officer list.',
  callback: 'Signing in didn’t finish. Try again.',
}

/**
 * Officers sign in here with Google. It also says why someone was turned away: not an
 * officer yet, a sign-in that didn't finish, or a dashboard that isn't set up.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const { next: nextParam, reason } = await searchParams
  const next = safeNext(nextParam)
  const access = await getAccess()
  if (access.state === 'officer') redirect(next)

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoMark size={64} alt="" />
          <h1 className="m-0 text-[1.6rem] font-extrabold tracking-tight text-ink">Officer dashboard</h1>
          <p className="m-0 text-[0.92rem] text-muted">Members, events, posts, and the campus map, for CSEG officers.</p>
        </div>

        {access.state === 'unconfigured' ? (
          <Alert tone="warning" title="Supabase isn’t set up yet">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>, run the migration in{' '}
            <code>supabase/migrations</code>, and turn on Google sign-in in the Supabase project. Then restart <code>next dev</code>.
          </Alert>
        ) : (
          <>
            {access.state === 'not-officer' ? (
              <Alert tone="warning" title="Not on the officer list">
                You’re signed in as <strong>{access.email ?? 'an account with no email'}</strong>, which isn’t an officer account. Ask an admin to add you in Settings, or
                switch accounts.
              </Alert>
            ) : reason && ERRORS[reason] ? (
              <Alert tone="danger">{ERRORS[reason]}</Alert>
            ) : null}
            <div className="flex flex-col gap-3 rounded-2xl border border-line p-5">
              <GoogleButton next={next} />
              {access.state === 'not-officer' ? (
                <form action="/auth/signout" method="post" className="text-center">
                  <button type="submit" className="cursor-pointer text-[0.85rem] font-semibold text-ink-soft hover:text-ink hover:underline">
                    Sign out
                  </button>
                </form>
              ) : null}
            </div>
            <p className="m-0 text-center text-[0.8rem] text-muted">Use the Google account an admin added to the officer list.</p>
          </>
        )}

        <Link href="/" className={`${inlineLink} text-center text-[0.85rem]`}>
          Back to the site
        </Link>
      </div>
    </div>
  )
}
