import { redirect } from 'next/navigation'
import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import type { OfficerRow } from '@/lib/supabase/types'

/**
 * The dashboard's data access layer: who's asking, and whether they may. Every dashboard
 * page and server action goes through here before touching data. Row-level security in
 * the database enforces the same rule, so a missed check still can't leak or change data.
 */

export type DashboardAccess =
  | { state: 'unconfigured' }
  | { state: 'signed-out' }
  | { state: 'not-officer'; email: string | null }
  | { state: 'officer'; officer: OfficerRow; avatarUrl: string | null }

/** Who's signed in and whether they're an officer, once per request */
export const getAccess = cache(async (): Promise<DashboardAccess> => {
  const supabase = await createClient()
  if (!supabase) return { state: 'unconfigured' }
  // getUser() asks Supabase Auth, so a tampered cookie can't pass as someone else
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return { state: 'signed-out' }
  const email = user.email ?? null
  if (!email) return { state: 'not-officer', email: null }
  const { data: officer } = await supabase.from('officers').select('*').eq('email', email).maybeSingle()
  if (!officer) return { state: 'not-officer', email }
  const meta = user.user_metadata as { avatar_url?: string; picture?: string } | undefined
  return { state: 'officer', officer, avatarUrl: meta?.avatar_url ?? meta?.picture ?? null }
})

/** Why someone was turned away, for the login page to explain */
export type LoginReason = 'not-officer' | 'unconfigured'

/**
 * The officer making this request, and a Supabase client acting as them. Anyone else is
 * sent to /login, which says why (signed out, not an officer, or Supabase not set up).
 */
export async function requireOfficer() {
  const access = await getAccess()
  if (access.state === 'signed-out') redirect('/login')
  if (access.state === 'unconfigured') redirect('/login?reason=unconfigured')
  if (access.state === 'not-officer') redirect('/login?reason=not-officer')
  const supabase = (await createClient())!
  return { officer: access.officer, supabase }
}

/** As requireOfficer, for what only admins may do (the officer list, club settings) */
export async function requireAdmin() {
  const ctx = await requireOfficer()
  if (ctx.officer.role !== 'admin') throw new Error('Only admins can do that.')
  return ctx
}
