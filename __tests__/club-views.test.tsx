import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'

import { NotificationProvider } from '@/components'
import { ClubDetailsProvider } from '@/globals/ClubDetails'
import { SiteBanner } from '@/globals/SiteBanner'
import { SocialIcons } from '@/globals/SocialIcons'
import { clubDetailsFrom } from '@/lib/clubDetails'
import type { CheckinRow, ClubSettingsRow, DuesPaymentRow, EventRsvpRow, FaqRow, JoinRequestRow, MemberRow, TermRow } from '@/lib/supabase/types'

import { navFor } from '../app/(dashboard)/dashboard/DashboardShell'
import { DuesView } from '../app/(dashboard)/dashboard/dues/DuesView'
import { CheckinView } from '../app/(dashboard)/dashboard/events/[id]/CheckinView'
import { FaqsView } from '../app/(dashboard)/dashboard/faqs/FaqsView'
import { MembersView } from '../app/(dashboard)/dashboard/members/MembersView'
import { RequestsView } from '../app/(dashboard)/dashboard/requests/RequestsView'
import { SettingsView } from '../app/(dashboard)/dashboard/settings/SettingsView'

const refresh = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh, replace: jest.fn(), push: jest.fn() }), usePathname: () => '/dashboard' }))

const ok = { ok: true }
jest.mock('../app/lib/dashboard/actions', () => ({
  saveMember: jest.fn(async () => ok),
  setMemberStatus: jest.fn(async () => ok),
  removeMembers: jest.fn(async () => ok),
  checkIn: jest.fn(async () => ok),
  undoCheckIn: jest.fn(async () => ok),
  saveSettings: jest.fn(async () => ({ ok: true, message: 'Saved' })),
  saveOfficer: jest.fn(async () => ok),
  updateOfficer: jest.fn(async () => ok),
  removeOfficer: jest.fn(async () => ok),
  saveTerm: jest.fn(async () => ok),
  deleteTerm: jest.fn(async () => ok),
  saveDues: jest.fn(async () => ({ ok: true, message: 'Recorded Sam Kim’s dues' })),
  deleteDues: jest.fn(async () => ok),
  approveJoinRequest: jest.fn(async () => ({ ok: true, message: 'Added Priya Patel to Members' })),
  setJoinRequestStatus: jest.fn(async () => ok),
  deleteJoinRequests: jest.fn(async () => ok),
  saveFaq: jest.fn(async () => ok),
  deleteFaq: jest.fn(async () => ok),
  reorderFaqs: jest.fn(async () => ok),
}))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const actions = require('../app/lib/dashboard/actions') as Record<string, jest.Mock>

jest.setTimeout(20_000)

const wrap = (ui: ReactNode) => render(<NotificationProvider>{ui}</NotificationProvider>)
const stamp = '2026-10-20T15:00:00Z'

const MEMBERS: MemberRow[] = [
  { id: 'm1', name: 'Jordan Lee', email: 'jordan@student.gsu.edu', major: 'Biology', year: 'Junior', status: 'active', joined_on: '2026-09-01', notes: null, created_at: stamp, updated_at: stamp },
  { id: 'm2', name: 'Sam Kim', email: 'sam@student.gsu.edu', major: 'Business', year: 'Freshman', status: 'new', joined_on: '2026-10-02', notes: null, created_at: stamp, updated_at: stamp },
  { id: 'm3', name: 'Alex Cruz', email: null, major: null, year: null, status: 'inactive', joined_on: '2025-09-01', notes: null, created_at: stamp, updated_at: stamp },
]
// A term that runs past any day these tests could run on, so it's always the current one
const TERM: TermRow = { id: 't1', name: 'Fall 2026', starts_on: '2026-08-24', ends_on: '2099-12-15', created_at: stamp, updated_at: stamp }
const PAYMENT: DuesPaymentRow = { id: 'd1', member_id: 'm1', term_id: 't1', amount: 15, paid_on: '2026-09-03', method: 'cash', note: null, recorded_by: 'pres@gsu.edu', created_at: stamp, updated_at: stamp }

describe('the dashboard’s club screens', () => {
  beforeEach(() => jest.clearAllMocks())

  it('Dues: counts who’s paid of those expected to, and records a payment at the set amount', async () => {
    wrap(<DuesView members={MEMBERS} terms={[TERM]} payments={[PAYMENT]} duesAmount={15} isAdmin />)
    // The inactive member isn't expected to pay, and isn't listed
    expect(screen.getByText('1 of 2')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Alex Cruz' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Jordan Lee/ })).getByText('Paid')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Sam Kim/ })).getByText('Unpaid')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Record Sam Kim’s dues' }))
    const dialog = screen.getByRole('dialog', { name: 'Record Sam Kim’s dues' })
    expect(within(dialog).getByLabelText(/Amount/)).toHaveValue('15')
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Record' })))
    const [id, sent] = actions.saveDues.mock.calls[0] as [string | null, FormData]
    expect(id).toBeNull()
    expect(sent.get('member_id')).toBe('m2')
    expect(sent.get('term_id')).toBe('t1')
    expect(sent.get('amount')).toBe('15')
    expect(refresh).toHaveBeenCalled()
  })

  it('Dues: with no terms yet, points to where they’re added', () => {
    wrap(<DuesView members={MEMBERS} terms={[]} payments={[]} duesAmount={null} isAdmin />)
    expect(screen.getByText('Add a term first')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Settings' })).toHaveAttribute('href', '/dashboard/settings')
  })

  it('Members: shows who’s paid for the current term, once there is one', () => {
    const { unmount } = wrap(<MembersView members={MEMBERS} startAdding={false} />)
    expect(screen.queryByRole('columnheader', { name: /Dues/ })).not.toBeInTheDocument()
    unmount()
    wrap(<MembersView members={MEMBERS} dues={{ term: 'Fall 2026', paid: ['m1'] }} startAdding={false} />)
    expect(screen.getByRole('columnheader', { name: /Dues, Fall 2026/ })).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Jordan Lee/ })).getByText('Paid')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Sam Kim/ })).getByText('Unpaid')).toBeInTheDocument()
  })

  it('Join requests: shows who’s waiting first, and approving one adds them to Members', async () => {
    const requests: JoinRequestRow[] = [
      { id: 'r1', name: 'Priya Patel', email: 'priya@student.gsu.edu', major: 'Nursing', year: 'Sophomore', message: 'Excited to join!', status: 'pending', member_id: null, handled_at: null, handled_by: null, created_at: stamp },
      { id: 'r2', name: 'Old Request', email: 'old@student.gsu.edu', major: null, year: null, message: null, status: 'declined', member_id: null, handled_at: stamp, handled_by: 'pres@gsu.edu', created_at: stamp },
    ]
    wrap(<RequestsView requests={requests} />)
    expect(screen.getByRole('button', { name: /^Priya Patel priya/ })).toBeInTheDocument()
    expect(screen.queryByText('Old Request')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Priya Patel priya/ }))
    const dialog = screen.getByRole('dialog', { name: 'Priya Patel' })
    expect(within(dialog).getByText('Excited to join!')).toBeInTheDocument()
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Add to Members' })))
    expect(actions.approveJoinRequest).toHaveBeenCalledWith('r1')
    expect((await screen.findAllByText('Added Priya Patel to Members')).length).toBeGreaterThan(0)
    expect(refresh).toHaveBeenCalled()
  })

  it('Check-in: lists who RSVP’d and isn’t here yet, and checks them in as the member they are', async () => {
    const checkins: CheckinRow[] = [{ id: 'c1', event_id: 'e1', event_name: null, member_id: 'm1', name: 'Jordan Lee', email: 'jordan@student.gsu.edu', checked_in_at: stamp, checked_in_by: null }]
    const rsvps: EventRsvpRow[] = [
      { id: 'v1', event_id: 'e1', name: 'Jordan', email: 'Jordan@student.gsu.edu', created_at: stamp },
      { id: 'v2', event_id: 'e1', name: 'Sammy', email: 'sam@student.gsu.edu', created_at: stamp },
    ]
    wrap(<CheckinView eventId="e1" checkins={checkins} members={MEMBERS} rsvps={rsvps} />)
    const waiting = screen.getByRole('list', { name: 'RSVP’d, not here yet' })
    // Jordan is already in; only Sam is still expected
    expect(within(waiting).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('1 came')).toBeInTheDocument()
    await act(async () => fireEvent.click(within(waiting).getByRole('button', { name: 'Check in Sammy' })))
    const sent = actions.checkIn.mock.calls[0][0] as FormData
    expect(sent.get('member_id')).toBe('m2')
    expect(sent.get('name')).toBe('Sam Kim')
    expect(sent.get('event_id')).toBe('e1')
  })

  it('Check-in: with guests turned off, takes members only', () => {
    wrap(<CheckinView eventId="e1" checkins={[]} members={MEMBERS} walkinsAllowed={false} />)
    expect(screen.queryByLabelText('Guest name')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Check in/ })).toBeDisabled()
  })

  it('Questions: says the About page keeps its own until some are added', () => {
    const { unmount } = wrap(<FaqsView faqs={[]} />)
    expect(screen.getByText('No questions here yet')).toBeInTheDocument()
    unmount()
    const faqs: FaqRow[] = [{ id: 'f1', question: 'Who can join?', answer: 'Any Georgia State student.', sort: 10, published: false, created_at: stamp, updated_at: stamp }]
    wrap(<FaqsView faqs={faqs} />)
    expect(screen.getByText('Who can join?')).toBeInTheDocument()
    expect(screen.getByText('Hidden')).toBeInTheDocument()
  })

  it('Settings: each part saves on its own, and says which part it is', async () => {
    const settings = { id: 1, tagline: 'Hi', banner_message: 'Meeting moved', banner_tone: 'warning', accepting_members: true, contact_form_open: true, walkins_allowed: true, walkins_become_members: false, updated_at: stamp, updated_by: null } as ClubSettingsRow
    wrap(<SettingsView settings={settings} officers={[]} terms={[TERM]} me="pres@gsu.edu" isAdmin />)
    const notice = screen.getByRole('heading', { name: 'Notice across the site' }).closest('section')!
    expect(within(notice).getByLabelText('What it says')).toHaveValue('Meeting moved')
    await act(async () => fireEvent.click(within(notice).getByRole('button', { name: 'Save' })))
    const sent = actions.saveSettings.mock.calls[0][0] as FormData
    expect(sent.get('section')).toBe('banner')
    expect(sent.get('banner_message')).toBe('Meeting moved')
    expect(sent.get('banner_tone')).toBe('warning')
    // The club's details aren't part of that save
    expect(sent.has('tagline')).toBe(false)
    // The term today falls in is marked
    expect(within(screen.getByRole('list', { name: 'Terms' })).getByText('Current')).toBeInTheDocument()
  })

  it('Settings: someone who isn’t an admin can read the new parts, not change them', () => {
    wrap(<SettingsView settings={null} officers={[{ email: 'web@gsu.edu', name: 'Web', title: null, role: 'editor', created_at: stamp }]} terms={[TERM]} me="web@gsu.edu" isAdmin={false} />)
    expect(screen.getAllByText('Editor').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Discord')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Add a term' })).not.toBeInTheDocument()
  })
})

describe('the sidebar, by role', () => {
  const hrefs = (role: 'editor' | 'officer' | 'admin') => navFor(0, 2, role).flatMap((s) => s.items.map((i) => i.href))

  it('keeps what’s about people from an editor', () => {
    const editor = hrefs('editor')
    for (const href of ['/dashboard/members', '/dashboard/messages', '/dashboard/dues', '/dashboard/requests', '/dashboard/minutes']) expect(editor).not.toContain(href)
    for (const href of ['/dashboard/posts', '/dashboard/faqs', '/dashboard/redirects', '/dashboard/sponsors', '/dashboard/settings']) expect(editor).toContain(href)
  })

  it('shows officers everything, with how many requests are waiting', () => {
    expect(hrefs('officer')).toEqual(expect.arrayContaining(['/dashboard/members', '/dashboard/dues', '/dashboard/requests', '/dashboard/minutes']))
    const requests = navFor(0, 2, 'officer').flatMap((s) => s.items).find((i) => i.href === '/dashboard/requests')
    expect(requests?.count).toBe(2)
  })
})

describe('the site, from Settings', () => {
  it('shows the notice, linked where officers pointed it, and nothing when there’s none', () => {
    const { unmount } = render(
      <ClubDetailsProvider details={clubDetailsFrom({ banner_message: 'Tonight’s meeting moved to room 260', banner_href: '/events', banner_tone: 'warning' })}>
        <SiteBanner />
      </ClubDetailsProvider>
    )
    const notice = screen.getByRole('complementary', { name: 'Notice' })
    expect(within(notice).getByRole('link', { name: /Tonight’s meeting moved to room 260/ })).toHaveAttribute('href', '/events')
    unmount()
    render(
      <ClubDetailsProvider details={clubDetailsFrom(null)}>
        <SiteBanner />
      </ClubDetailsProvider>
    )
    expect(screen.queryByRole('complementary', { name: 'Notice' })).not.toBeInTheDocument()
  })

  it('adds a button for each place the club is online once officers give its link', () => {
    render(
      <ClubDetailsProvider details={clubDetailsFrom({ discord_url: 'https://discord.gg/abc' })}>
        <SocialIcons />
      </ClubDetailsProvider>
    )
    expect(screen.getByRole('link', { name: 'Discord' })).toHaveAttribute('href', 'https://discord.gg/abc')
    expect(screen.queryByRole('link', { name: 'YouTube' })).not.toBeInTheDocument()
  })
})
