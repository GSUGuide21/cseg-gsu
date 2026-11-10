import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { NotificationProvider } from '@/components'
import { setMemberStatus } from '../app/lib/dashboard/actions'
import type { MemberRow } from '@/lib/supabase/types'

import { MemberProfile, type MemberCheckin } from '../app/(dashboard)/dashboard/members/[id]/MemberProfile'
import { MembersView } from '../app/(dashboard)/dashboard/members/MembersView'

const refresh = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh, replace: jest.fn(), push: jest.fn() }), usePathname: () => '/dashboard/members' }))
jest.mock('../app/lib/dashboard/actions', () => ({
  saveMember: jest.fn(),
  removeMembers: jest.fn(),
  setMemberStatus: jest.fn(async () => ({ ok: true })),
}))

const day = 86_400_000
const ago = (days: number) => new Date(Date.now() - days * day).toISOString()
const MEMBER: MemberRow = { id: 'm1', name: 'Jordan Lee', email: 'jordan@student.gsu.edu', major: 'Biology', year: 'Junior', status: 'active', joined_on: ago(300).slice(0, 10), notes: 'Runs the welcome table', created_at: ago(300), updated_at: ago(300) }
const checkin = (id: string, eventName: string | null, days: number, linked = true): MemberCheckin => ({ id, eventId: `e-${id}`, eventName, linked, checkedInAt: ago(days) })

const show = (member: MemberRow, history: MemberCheckin[]) =>
  render(
    <NotificationProvider>
      <MemberProfile member={member} history={history} />
    </NotificationProvider>
  )

describe('Member profile', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows their details and what they’ve come to', () => {
    show(MEMBER, [checkin('a', 'Fall Field Day', 5), checkin('b', 'Welcome Mixer', 40)])
    expect(screen.getByRole('heading', { name: /Jordan Lee/ })).toBeInTheDocument()
    expect(screen.getByText('Events attended').closest('div')?.parentElement).toHaveTextContent('2')
    expect(screen.getByRole('link', { name: 'Fall Field Day' })).toHaveAttribute('href', '/dashboard/events/e-a')
    expect(screen.getByText('Runs the welcome table', { selector: 'span' })).toBeInTheDocument()
  })

  it('names events PIN no longer lists without linking them, and copes with no name at all', () => {
    show(MEMBER, [checkin('a', 'Old Social', 5, false), checkin('b', null, 8, false)])
    expect(screen.getByText('Old Social')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Old Social' })).not.toBeInTheDocument()
    expect(screen.getByText('An event')).toBeInTheDocument()
  })

  it('points out an active member who’s gone quiet, and leaves the call to officers', async () => {
    show(MEMBER, [checkin('a', 'Old Social', 120)])
    expect(screen.getByText('No check-ins in 90 days')).toBeInTheDocument()
    expect(setMemberStatus).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark inactive' }))
    })
    expect(setMemberStatus).toHaveBeenCalledWith(['m1'], 'inactive')
  })

  it('doesn’t nag about members who come, or who are already inactive', () => {
    const { unmount } = show(MEMBER, [checkin('a', 'Fall Field Day', 5)])
    expect(screen.queryByText('No check-ins in 90 days')).not.toBeInTheDocument()
    unmount()
    show({ ...MEMBER, status: 'inactive' }, [])
    expect(screen.queryByText('No check-ins in 90 days')).not.toBeInTheDocument()
    expect(screen.getByText('No check-ins yet')).toBeInTheDocument()
  })
})

describe('Members table', () => {
  it('links each name to their profile, with their attendance alongside', () => {
    const sam: MemberRow = { ...MEMBER, id: 'm2', name: 'Sam Kim' }
    render(
      <NotificationProvider>
        <MembersView members={[MEMBER, sam]} attendance={{ m1: { events: 7, lastSeen: '2026-10-20T15:00:00Z' } }} startAdding={false} />
      </NotificationProvider>
    )
    expect(screen.getByRole('link', { name: 'Jordan Lee' })).toHaveAttribute('href', '/dashboard/members/m1')
    expect(screen.getByRole('cell', { name: '7' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Oct 20, 2026' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Not yet' })).toBeInTheDocument()
  })
})
