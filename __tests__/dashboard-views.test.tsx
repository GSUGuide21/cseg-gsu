import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'

import { NotificationProvider } from '@/components'
import type { CheckinRow, ClubSettingsRow, EateryRow, MapPlaceRow, MemberRow, OfficerRow, PageRow, PostRow } from '@/lib/supabase/types'

import { DocumentEditor } from '../app/(dashboard)/dashboard/DocumentEditor'
import { DocumentList } from '../app/(dashboard)/dashboard/DocumentList'
import { EateriesView } from '../app/(dashboard)/dashboard/eateries/EateriesView'
import { CheckinView } from '../app/(dashboard)/dashboard/events/[id]/CheckinView'
import { MapView } from '../app/(dashboard)/dashboard/map/MapView'
import { MembersView } from '../app/(dashboard)/dashboard/members/MembersView'
import { SettingsView } from '../app/(dashboard)/dashboard/settings/SettingsView'

const refresh = jest.fn()
const replace = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh, replace, push: jest.fn() }), usePathname: () => '/dashboard' }))

// The server actions, answering as Supabase would
const ok = { ok: true }
jest.mock('../app/lib/dashboard/actions', () => ({
  saveMember: jest.fn(async () => ({ ok: true, id: 'm9', message: 'Added Priya Patel' })),
  setMemberStatus: jest.fn(async () => ok),
  removeMembers: jest.fn(async () => ok),
  checkIn: jest.fn(async () => ({ ok: false, errors: { name: 'Add a name.' } })),
  undoCheckIn: jest.fn(async () => ok),
  savePost: jest.fn(async () => ({ ok: true, id: 'p-new', message: 'Draft saved' })),
  checkSlug: jest.fn(async () => ({ ok: true })),
  deletePost: jest.fn(),
  savePage: jest.fn(async () => ok),
  deletePage: jest.fn(),
  savePlace: jest.fn(async () => ok),
  deletePlace: jest.fn(async () => ok),
  saveEatery: jest.fn(async () => ok),
  deleteEatery: jest.fn(async () => ok),
  saveSettings: jest.fn(async () => ok),
  saveOfficer: jest.fn(async () => ok),
  removeOfficer: jest.fn(async () => ok),
}))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const actions = require('../app/lib/dashboard/actions') as Record<string, jest.Mock>

// Whole dashboard screens (and the rich text editor) are slow to render in jsdom when every
// test file runs at once; the default 5 seconds is too tight for them
jest.setTimeout(20_000)

const wrap = (ui: ReactNode) => render(<NotificationProvider>{ui}</NotificationProvider>)
const stamp = '2026-10-20T15:00:00Z'

const MEMBERS: MemberRow[] = [
  { id: 'm1', name: 'Jordan Lee', email: 'jordan@student.gsu.edu', major: 'Biology', year: 'Junior', status: 'active', joined_on: '2026-09-01', notes: null, created_at: stamp, updated_at: stamp },
  { id: 'm2', name: 'Sam Kim', email: null, major: 'Business', year: 'Freshman', status: 'new', joined_on: '2026-10-02', notes: null, created_at: stamp, updated_at: stamp },
]

describe('Dashboard views', () => {
  beforeEach(() => jest.clearAllMocks())

  it('Members: filters, selects for bulk actions, and adds a member', async () => {
    wrap(<MembersView members={MEMBERS} startAdding={false} />)
    expect(screen.getByRole('heading', { name: 'Members' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search members' }), { target: { value: 'sam' } })
    expect(screen.getByText('1 result')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Sam Kim' }))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Mark active' })))
    expect(actions.setMemberStatus).toHaveBeenCalledWith(['m2'], 'active')

    fireEvent.click(screen.getByRole('button', { name: 'Add member' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a member' })
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: 'Priya Patel' } })
    await act(async () => fireEvent.submit(dialog.querySelector('form')!))
    expect(actions.saveMember).toHaveBeenCalledWith(null, expect.any(FormData))
    expect((actions.saveMember.mock.calls[0] as unknown[])[1] as FormData).toBeInstanceOf(FormData)
    // The toast, and its screen-reader announcement
    expect((await screen.findAllByText('Added Priya Patel')).length).toBeGreaterThan(0)
    expect(refresh).toHaveBeenCalled()
  })

  it('Check-in: shows a field’s error from the server, and the people already in', async () => {
    const checkins: CheckinRow[] = [{ id: 'c1', event_id: 'e1', member_id: 'm1', name: 'Jordan Lee', email: null, checked_in_at: stamp, checked_in_by: null }]
    wrap(<CheckinView eventId="e1" checkins={checkins} members={MEMBERS} />)
    expect(screen.getByRole('rowheader', { name: 'Jordan Lee' })).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Check in/ })))
    expect(await screen.findByText('Add a name.')).toBeInTheDocument()
  })

  it('Posts: lists them, and the editor makes the address from the title and saves', async () => {
    wrap(<DocumentList kind="post" docs={[{ id: 'p1', slug: 'hello', title: 'Hello', status: 'published', updated_at: stamp, by: 'jordan@gsu.edu' }]} />)
    expect(screen.getByRole('link', { name: 'Hello' })).toHaveAttribute('href', '/dashboard/posts/p1')

    wrap(<DocumentEditor kind="post" doc={null} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Fall Social Recap' } })
    expect(screen.getByLabelText('Web address')).toHaveValue('fall-social-recap')
    // The search preview follows along
    expect(screen.getByText('cseg · /posts/fall-social-recap')).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save draft' })))
    const sent = (actions.savePost.mock.calls[0] as unknown[])[1] as FormData
    expect(sent.get('slug')).toBe('fall-social-recap')
    expect(sent.get('status')).toBe('draft')
    // The body goes in the editor's own format
    expect(JSON.parse(String(sent.get('body'))).root.type).toBe('root')
    expect(replace).toHaveBeenCalledWith('/dashboard/posts/p-new')
  })

  it('Pages: a subtitle, and sections each with its own title, subtitle, and editor', async () => {
    const page: PageRow = {
      id: 'g1',
      slug: 'guide',
      title: 'Guide',
      description: 'A first-month guide.',
      subtitle: null,
      layout: 'document',
      sections: [],
      body: JSON.stringify({ root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'Welcome, Panthers.' }] }] } }),
      status: 'draft',
      updated_by: null,
      created_at: stamp,
      updated_at: stamp,
    }
    wrap(<DocumentEditor kind="page" doc={page} />)
    // The subtitle shows the description until one's written
    const subtitle = screen.getByRole('textbox', { name: 'Subtitle' })
    expect(subtitle).toHaveAttribute('placeholder', expect.stringContaining('A first-month guide.'))
    fireEvent.change(subtitle, { target: { value: 'Everything for your first month.' } })

    // Into sections: the page's writing comes along as the first section
    fireEvent.click(screen.getByRole('radio', { name: 'Sections' }))
    expect(screen.queryByRole('textbox', { name: 'Body' })).not.toBeInTheDocument()
    const first = await screen.findByRole('textbox', { name: 'Section 1 writing' })
    expect(await within(first).findByText('Welcome, Panthers.')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Section 1 title' }), { target: { value: 'Welcome' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add a section' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Section 2 title' }), { target: { value: 'Finding help' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Section 2 subtitle' }), { target: { value: 'Free support.' } })
    // Second one first
    fireEvent.click(screen.getByRole('button', { name: 'Move section 2 up' }))
    expect(screen.getByRole('textbox', { name: 'Section 1 title' })).toHaveValue('Finding help')

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save draft' })))
    const sent = (actions.savePage.mock.calls.at(-1) as unknown[])[1] as FormData
    expect(sent.get('layout')).toBe('sections')
    expect(sent.get('subtitle')).toBe('Everything for your first month.')
    const sections = JSON.parse(String(sent.get('sections'))) as { title: string; subtitle: string; body: string }[]
    expect(sections.map((s) => [s.title, s.subtitle])).toEqual([
      ['Finding help', 'Free support.'],
      ['Welcome', ''],
    ])
    expect(sections[1].body).toContain('Welcome, Panthers.')
    // The page's own writing is kept for the other layout
    expect(String(sent.get('body'))).toContain('Welcome, Panthers.')
  })

  it('Editing a published post keeps its address unless changed, and links to it', () => {
    const post: PostRow = { id: 'p1', slug: 'hello', title: 'Hello', excerpt: null, body: '', cover_image_url: null, status: 'published', published_at: stamp, author_email: null, created_at: stamp, updated_at: stamp }
    wrap(<DocumentEditor kind="post" doc={post} />)
    expect(screen.getByText('Live')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Hello again' } })
    expect(screen.getByLabelText('Web address')).toHaveValue('hello')
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View on the site/ })).toHaveAttribute('href', '/posts/hello')
  })

  it('Map: lists pins and fills coordinates from a pasted link', () => {
    const pin: MapPlaceRow = { id: 'x1', name: 'Meeting room', category: 'student-life', lat: 33.7531, lng: -84.3853, address: 'SCW 259', description: '', published: true, created_at: stamp, updated_at: stamp }
    wrap(<MapView places={[pin]} />)
    expect(screen.getByText('33.75310, -84.38530')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add a pin' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a pin' })
    fireEvent.change(within(dialog).getByLabelText('Paste a map link'), { target: { value: 'https://www.google.com/maps/@33.7512,-84.3861,18z' } })
    expect(within(dialog).getByLabelText(/Latitude/)).toHaveValue(33.7512)
  })

  it('Eateries: lists them in the page’s order and edits hours that save as JSON', async () => {
    const row = (over: Partial<EateryRow>): EateryRow => ({
      id: 'e1', slug: 'taco-spot', name: 'Taco Spot', area: 'park-place', dining_hall: false, address: '1 Park Place', description: '', hours: null, schedule: null,
      status: null, note: null, lat: 33.754, lng: -84.386, locations: [], place_id: null, url: null, aliases: [], sort: 10, published: true, created_at: stamp, updated_at: stamp, ...over,
    })
    wrap(<EateriesView eateries={[row({}), row({ id: 'e2', slug: 'big-hall', name: 'Big Hall', area: 'campus', lat: null, lng: null, place_id: 'piedmont-central', schedule: [{ days: [1], open: '07:00', close: '21:00' }] })]} />)
    // Campus first, as the page lists the areas
    const names = screen.getAllByRole('row').slice(1).map((r) => r.textContent?.match(/Taco Spot|Big Hall/)?.[0])
    expect(names).toEqual(['Big Hall', 'Taco Spot'])
    expect(screen.getByText('In Piedmont Central')).toBeInTheDocument()
    expect(screen.getByText('Hours set')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add an eatery' }))
    const dialog = screen.getByRole('dialog', { name: 'Add an eatery' })
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: 'Noodle Bar' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add hours' }))
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'All day' }))
    await act(async () => fireEvent.submit(dialog.querySelector('form')!))
    const sent = actions.saveEatery.mock.calls[0][1] as FormData
    expect(sent.get('name')).toBe('Noodle Bar')
    expect(JSON.parse(sent.get('schedule') as string)).toEqual([{ days: [1, 2, 3, 4, 5], open: '00:00', close: '24:00' }])
    expect(JSON.parse(sent.get('locations') as string)).toEqual([])
  })

  it('Settings: officers see the list; only admins can change it', () => {
    const officers: OfficerRow[] = [
      { email: 'pres@gsu.edu', name: 'Jordan', title: 'President', role: 'admin', created_at: stamp },
      { email: 'treas@gsu.edu', name: 'Sam', title: 'Treasurer', role: 'officer', created_at: stamp },
    ]
    const settings: ClubSettingsRow = { id: 1, tagline: 'Hi', meeting_info: null, contact_email: null, instagram_url: null, updated_at: stamp, updated_by: null }
    const { unmount } = wrap(<SettingsView settings={settings} officers={officers} me="treas@gsu.edu" isAdmin={false} />)
    expect(screen.getByText('Only admins can add or remove officers.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Give access' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Tagline')).toBeDisabled()
    unmount()
    wrap(<SettingsView settings={settings} officers={officers} me="pres@gsu.edu" isAdmin />)
    expect(screen.getByRole('button', { name: 'Give access' })).toBeInTheDocument()
    // Admins can remove others, not themselves
    expect(screen.getByRole('button', { name: 'Remove Sam' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove Jordan' })).not.toBeInTheDocument()
  })
})
