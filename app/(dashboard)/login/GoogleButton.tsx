'use client'

import { useState, type FC } from 'react'

import { Button } from '@/components'
import { createClient } from '@/lib/supabase/client'

/** Google's "G", in its colors */
const GoogleMark: FC = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.2v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.2a12 12 0 0 0 0 10.8l4.1-3.1Z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.2 6.6l4.1 3.1c1-2.9 3.6-4.9 6.7-4.9Z" />
  </svg>
)

/** Starts Google sign-in; Google sends them back to /auth/callback, which finishes it */
export const GoogleButton: FC<{ next: string }> = ({ next }) => {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        variant="outline"
        block
        loading={pending}
        leading={<GoogleMark />}
        onClick={async () => {
          const supabase = createClient()
          if (!supabase) return setError('Supabase isn’t set up yet.')
          setPending(true)
          setError(null)
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
              // Always offer the account picker, so an officer can switch to their club account
              queryParams: { prompt: 'select_account' },
            },
          })
          if (error) {
            setPending(false)
            setError(error.message)
          }
        }}
        className="border-line text-ink hover:border-brand-edge hover:bg-fill hover:text-ink"
      >
        Continue with Google
      </Button>
      {error ? (
        <p role="alert" className="m-0 text-center text-[0.85rem] font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
