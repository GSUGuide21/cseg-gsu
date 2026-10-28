/** @jest-environment node */
import { NextRequest } from 'next/server'

// A stand-in Supabase: who's signed in, and the officer row for their email
let user: { email?: string; user_metadata?: Record<string, string> } | null = null
let officer: Record<string, string> | null = null
let configured = true

// A relative path: SWC rewrites @/ in imports, but not in jest.mock's string
jest.mock('../app/lib/supabase/server', () => ({
  createClient: async () =>
    configured
      ? {
          auth: { getUser: async () => ({ data: { user } }) },
          from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: officer }) }) }) }),
        }
      : null,
}))

import { getAccess, requireAdmin, requireOfficer } from '@/lib/dashboard/dal'

import { proxy } from '../proxy'

/** Where a redirect() would have sent them */
const redirectedTo = async (run: () => Promise<unknown>) => {
  try {
    await run()
  } catch (e) {
    const digest = (e as { digest?: string }).digest ?? ''
    if (digest.startsWith('NEXT_REDIRECT')) return digest.split(';')[2]
    throw e
  }
  return null
}

beforeEach(() => {
  user = null
  officer = null
  configured = true
})

describe('Dashboard access', () => {
  it('knows when Supabase isn’t set up, or nobody’s signed in', async () => {
    configured = false
    expect(await getAccess()).toEqual({ state: 'unconfigured' })
    configured = true
    expect(await getAccess()).toEqual({ state: 'signed-out' })
  })

  it('turns away a signed-in account that isn’t on the officer list', async () => {
    user = { email: 'someone@gmail.com' }
    expect(await getAccess()).toEqual({ state: 'not-officer', email: 'someone@gmail.com' })
    expect(await redirectedTo(requireOfficer)).toBe('/login?reason=not-officer')
  })

  it('lets officers in, and only admins through requireAdmin', async () => {
    user = { email: 'treasurer@student.gsu.edu', user_metadata: { avatar_url: 'https://example.com/a.png' } }
    officer = { email: 'treasurer@student.gsu.edu', role: 'officer', name: 'Sam', title: 'Treasurer', created_at: '' }
    expect(await getAccess()).toMatchObject({ state: 'officer', avatarUrl: 'https://example.com/a.png' })
    expect((await requireOfficer()).officer.email).toBe('treasurer@student.gsu.edu')
    await expect(requireAdmin()).rejects.toThrow('Only admins')
    officer = { ...officer, role: 'admin' }
    expect((await requireAdmin()).officer.role).toBe('admin')
  })

  it('sends signed-out visitors to the login page', async () => {
    expect(await redirectedTo(requireOfficer)).toBe('/login')
  })
})

describe('Proxy', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  it('sends people who aren’t signed in to /login, remembering where they were going', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY
    const res = await proxy(new NextRequest('http://localhost:3000/dashboard/members?add=1'))
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('next')).toBe('/dashboard/members?add=1')
  })

  it('lets the login page through', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    const res = await proxy(new NextRequest('http://localhost:3000/login'))
    expect(res.headers.get('location')).toBeNull()
  })
})
