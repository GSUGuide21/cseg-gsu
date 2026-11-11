import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'

import { NotificationProvider } from '@/components'
import type { AffiliateRow, CheckinRow, ClubSettingsRow, ContactMessageRow, MapConnectionRow, EateryAreaRow, EateryClosureRow, EateryRow, HomepageRow, MapPlaceRow, PageMetaRow, MemberRow, OfficerRow, PageRow, PostRow, ResourceGroupRow, ResourceRow } from '@/lib/supabase/types'

import { DocumentEditor } from '../app/(dashboard)/dashboard/DocumentEditor'
import { DocumentList } from '../app/(dashboard)/dashboard/DocumentList'
import { EateriesView } from '../app/(dashboard)/dashboard/eateries/EateriesView'
import { CheckinView } from '../app/(dashboard)/dashboard/events/[id]/CheckinView'
import { HomepageView } from '../app/(dashboard)/dashboard/homepage/HomepageView'
import { MapView } from '../app/(dashboard)/dashboard/map/MapView'
import { AffiliatesView } from '../app/(dashboard)/dashboard/affiliates/AffiliatesView'
import { ConnectionsView } from '../app/(dashboard)/dashboard/connections/ConnectionsView'
import { MessagesView } from '../app/(dashboard)/dashboard/messages/MessagesView'
import { TitlesView } from '../app/(dashboard)/dashboard/titles/TitlesView'
import { MembersView } from '../app/(dashboard)/dashboard/members/MembersView'
import { ResourcesView } from '../app/(dashboard)/dashboard/resources/ResourcesView'
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
  reorderEateries: jest.fn(async () => ok),
  saveAreas: jest.fn(async () => ok),
  saveClosure: jest.fn(async () => ok),
  deleteClosure: jest.fn(async () => ok),
  listRevisions: jest.fn(async () => []),
  getRevision: jest.fn(async () => null),
  restoreRevision: jest.fn(async () => ok),
  saveResource: jest.fn(async () => ok),
  deleteResource: jest.fn(async () => ok),
  reorderResources: jest.fn(async () => ok),
  saveResourceGroups: jest.fn(async () => ok),
  saveHomepage: jest.fn(async () => ({ ok: true, message: 'Saved and on the homepage' })),
  savePageMeta: jest.fn(async () => ok),
  saveSettings: jest.fn(async () => ok),
  saveOfficer: jest.fn(async () => ok),
  updateOfficer: jest.fn(async () => ok),
  duplicateDocument: jest.fn(async () => ok),
  checkLinks: jest.fn(async () => []),
  removeOfficer: jest.fn(async () => ok),
  saveAffiliate: jest.fn(async () => ok),
  deleteAffiliate: jest.fn(async () => ok),
  reorderAffiliates: jest.fn(async () => ok),
  saveConnection: jest.fn(async () => ok),
  deleteConnection: jest.fn(async () => ok),
  markMessages: jest.fn(async () => ok),
  deleteMessages: jest.fn(async () => ok),
}))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const actions = require('../app/lib/dashboard/actions') as Record<string, jest.Mock>

// Whole dashboard screens (and the rich text editor) are slow to render in jsdom when every
// test file runs at once; the default 5 seconds is too tight for them
jest.setTimeout(20_000)

const wrap = (ui: ReactNode) => render(<NotificationProvider>{ui}</NotificationProvider>)
const stamp = '2026-10-20T15:00:00Z'
const POST_EXTRAS = { publish_at: null, unpublish_at: null, category: null, featured: false, author_name: null, review_requested: false, review_note: null }

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
    const checkins: CheckinRow[] = [{ id: 'c1', event_id: 'e1', event_name: null, member_id: 'm1', name: 'Jordan Lee', email: null, checked_in_at: stamp, checked_in_by: null }]
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
      eyebrow: null,
      share_image_url: null,
      show_toc: false,
      show_updated: false,
      publish_at: null,
      review_requested: false,
      review_note: null,
      parent_id: null,
      nav_placement: 'none',
      nav_label: null,
      nav_sort: 0,
      unpublish_at: null,
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

    // The label above the title, and the "On this page" list (sections only)
    fireEvent.change(screen.getByLabelText(/Label above the title/), { target: { value: 'New here?' } })
    fireEvent.click(screen.getByRole('switch', { name: /On this page/ }))

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save draft' })))
    const sent = (actions.savePage.mock.calls.at(-1) as unknown[])[1] as FormData
    expect(sent.get('eyebrow')).toBe('New here?')
    expect(sent.get('show_toc')).toBe('on')
    expect(sent.get('show_updated')).toBeNull()
    expect(sent.get('publish_at')).toBe('')
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
    const post: PostRow = { ...POST_EXTRAS, id: 'p1', slug: 'hello', title: 'Hello', excerpt: null, body: '', cover_image_url: null, status: 'published', published_at: stamp, author_email: null, created_at: stamp, updated_at: stamp }
    wrap(<DocumentEditor kind="post" doc={post} />)
    expect(screen.getByText('Live')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Hello again' } })
    expect(screen.getByLabelText('Web address')).toHaveValue('hello')
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View on the site/ })).toHaveAttribute('href', '/posts/hello')
  })

  it('Map: lists pins and fills coordinates from a pasted link', () => {
    const pin: MapPlaceRow = {
      id: 'x1',
      slug: null,
      name: 'Meeting room',
      category: 'student-life',
      lat: 33.7531,
      lng: -84.3853,
      address: 'SCW 259',
      description: '',
      aliases: [],
      also_in: [],
      tip: null,
      published: true,
      created_at: stamp,
      updated_at: stamp,
    }
    wrap(<MapView places={[pin]} />)
    expect(screen.getByText('33.75310, -84.38530')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add a pin' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a pin' })
    fireEvent.change(within(dialog).getByLabelText('Paste a map link'), { target: { value: 'https://www.google.com/maps/@33.7512,-84.3861,18z' } })
    expect(within(dialog).getByLabelText(/Latitude/)).toHaveValue(33.7512)
  })

  it('Map: tells campus places from club pins, and filters by kind', () => {
    const row = { category: 'student-life', lat: 33.7531, lng: -84.3853, address: null, description: '', aliases: [], also_in: [], tip: null, published: true, created_at: stamp, updated_at: stamp }
    const campus: MapPlaceRow = { ...row, id: 'c1', slug: 'student-center-west', name: 'Student Center West' }
    const club: MapPlaceRow = { ...row, id: 'p1', slug: null, name: 'Meeting room' }
    wrap(<MapView places={[campus, club]} />)
    expect(screen.getAllByText('Campus place').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Club pin').length).toBeGreaterThan(0)
    fireEvent.click(within(screen.getByRole('search')).getByRole('button', { name: 'Kind' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Club pin/ }))
    expect(screen.getByText('Meeting room')).toBeInTheDocument()
    expect(screen.queryByText('Student Center West')).not.toBeInTheDocument()
  })

  it('Eateries: lists them in the page’s order and edits hours that save as JSON', async () => {
    const row = (over: Partial<EateryRow>): EateryRow => ({
      id: 'e1', slug: 'taco-spot', name: 'Taco Spot', area: 'park-place', dining_hall: false, address: '1 Park Place', description: '', hours: null, schedule: null,
      status: null, note: null, lat: 33.754, lng: -84.386, locations: [], place_id: null, url: null, aliases: [], sort: 10, published: true, checked_on: '2000-01-01', tip: null, created_at: stamp, updated_at: stamp, ...over,
    })
    const areas: EateryAreaRow[] = [
      { slug: 'campus', title: 'On campus', description: null, sort: 10, created_at: stamp, updated_at: stamp },
      { slug: 'park-place', title: 'Park Place', description: null, sort: 20, created_at: stamp, updated_at: stamp },
    ]
    // A break that's on today (whenever today is), closing the taco spot
    const closures: EateryClosureRow[] = [{ id: 'c1', label: 'winter break', starts_on: '2000-01-01', ends_on: '2999-12-31', eateries: ['taco-spot'], created_at: stamp, updated_at: stamp }]
    wrap(
      <EateriesView
        areas={areas}
        closures={closures}
        eateries={[row({}), row({ id: 'e2', slug: 'big-hall', name: 'Big Hall', area: 'campus', lat: null, lng: null, place_id: 'piedmont-central', schedule: [{ days: [1], open: '07:00', close: '21:00' }] })]}
      />
    )
    // Campus first, as the areas are ordered
    const names = screen.getAllByRole('table', { name: 'Eateries' })[0].querySelectorAll('tbody tr')
    expect([...names].map((r) => r.textContent?.match(/Taco Spot|Big Hall/)?.[0])).toEqual(['Big Hall', 'Taco Spot'])
    expect(screen.getByText('In Piedmont Central')).toBeInTheDocument()
    expect(screen.getByText('Hours set')).toBeInTheDocument()
    expect(screen.getByText('Closed for winter break through Dec 31')).toBeInTheDocument()
    // Checked long ago: both flagged
    expect(screen.getAllByText('Jan 1, 2000')).toHaveLength(2)
    expect(within(screen.getByRole('table', { name: 'Closures' })).getByText('Closed now')).toBeInTheDocument()

    // Arrange opens on the first area's eateries
    fireEvent.click(screen.getByRole('button', { name: 'Arrange' }))
    const arrange = screen.getByRole('dialog', { name: 'Arrange eateries' })
    expect(within(arrange).getByText('Big Hall')).toBeInTheDocument()
    expect(within(arrange).queryByText('Taco Spot')).not.toBeInTheDocument()
    fireEvent.click(within(arrange).getAllByRole('button', { name: 'Close' }).at(-1)!)

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

  it('History: lists each save, shows the one picked, and restores it', async () => {
    const post: PostRow = { ...POST_EXTRAS, id: 'p1', slug: 'hello', title: 'Hello again', excerpt: null, body: '', cover_image_url: null, status: 'draft', published_at: null, author_email: null, created_at: stamp, updated_at: stamp }
    actions.listRevisions.mockResolvedValueOnce([
      { id: 'r2', saved_at: '2026-10-28T19:00:00Z', saved_by: 'sam@gsu.edu', title: 'Hello again', status: 'draft' },
      { id: 'r1', saved_at: '2026-10-27T15:30:00Z', saved_by: 'jordan@gsu.edu', title: 'Hello', status: 'draft' },
    ])
    actions.getRevision.mockResolvedValue({ title: 'Hello', body: '', layout: 'document' })
    wrap(<DocumentEditor kind="post" doc={post} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'History' })))
    const dialog = screen.getByRole('dialog', { name: 'History' })
    // The one before now is picked, and read
    expect(within(dialog).getByRole('button', { name: /Oct 27.*jordan/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(dialog).getByText('Now')).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Restore this version' })))
    expect(actions.restoreRevision).toHaveBeenCalledWith('post', 'p1', 'r1')
  })

  it('Resources: lists them by group, and adds one to a group', async () => {
    const groups: ResourceGroupRow[] = [
      { slug: 'academics', title: 'Academics', description: null, icon: 'book', sort: 10, created_at: stamp, updated_at: stamp },
      { slug: 'money', title: 'Money & aid', description: null, icon: 'money', sort: 20, created_at: stamp, updated_at: stamp },
    ]
    const resource = (over: Partial<ResourceRow>): ResourceRow => ({ id: 'x1', slug: 'paws', group_slug: 'academics', label: 'PAWS', href: 'https://paws.gsu.edu', description: '', place_id: null, tip: null, sort: 10, published: true, created_at: stamp, updated_at: stamp, ...over })
    wrap(<ResourcesView groups={groups} resources={[resource({ id: 'x2', slug: 'aid', group_slug: 'money', label: 'Financial Aid' }), resource({})]} />)
    const rows = screen.getByRole('table', { name: 'Resources' }).querySelectorAll('tbody tr')
    expect([...rows].map((r) => r.textContent?.match(/PAWS|Financial Aid/)?.[0])).toEqual(['PAWS', 'Financial Aid'])

    fireEvent.click(screen.getByRole('button', { name: 'Add a resource' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a resource' })
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: 'Panther Pantry' } })
    fireEvent.change(within(dialog).getByLabelText(/Link/), { target: { value: 'https://pantry.gsu.edu' } })
    await act(async () => fireEvent.submit(dialog.querySelector('form')!))
    const sent = actions.saveResource.mock.calls[0][1] as FormData
    expect([sent.get('label'), sent.get('href'), sent.get('sort')]).toEqual(['Panther Pantry', 'https://pantry.gsu.edu', '20'])
  })

  it('Affiliates: lists them with their seals, and adds one', async () => {
    const affiliate: AffiliateRow = {
      id: 'a1',
      slug: 'lead-team',
      name: 'Lead Team',
      short_name: 'LEAD Team',
      wordmark_top: 'Lead',
      wordmark_bottom: 'Team',
      summary: null,
      description: '',
      instagram: 'leadteamgsu',
      pin_key: 'lead-team',
      logo_url: null,
      discord_url: null,
      sort: 10,
      published: false,
      created_at: stamp,
      updated_at: stamp,
    }
    wrap(<AffiliatesView affiliates={[affiliate]} />)
    const table = screen.getByRole('table', { name: 'Affiliates' })
    expect(within(table).getByText('LEAD Team')).toBeInTheDocument()
    expect(within(table).getByText('Lead Team')).toBeInTheDocument()
    expect(within(table).getByText('LT')).toBeInTheDocument()
    expect(within(table).getByText('Hidden')).toBeInTheDocument()
    // One affiliate has no order to arrange
    expect(screen.queryByRole('button', { name: 'Arrange' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add an affiliate' }))
    const dialog = screen.getByRole('dialog', { name: 'Add an affiliate' })
    fireEvent.change(within(dialog).getByLabelText(/Full name/), { target: { value: 'Chess Club at Georgia State' } })
    fireEvent.change(within(dialog).getByLabelText(/^Instagram/), { target: { value: '@gsuchess' } })
    fireEvent.change(within(dialog).getByLabelText(/bold line/), { target: { value: 'Chess' } })
    await act(async () => fireEvent.submit(dialog.querySelector('form')!))
    const [id, sent] = actions.saveAffiliate.mock.calls[0] as [string | null, FormData]
    expect(id).toBeNull()
    expect([sent.get('name'), sent.get('instagram'), sent.get('wordmark_top'), sent.get('published')]).toEqual(['Chess Club at Georgia State', '@gsuchess', 'Chess', 'on'])
    expect(refresh).toHaveBeenCalled()
  })

  it('Shortcuts: lists them with the buildings they join, and sends the path as typed', async () => {
    const connection: MapConnectionRow = {
      id: 'k1',
      slug: 'the-link',
      name: 'The Link',
      kind: 'indoor',
      note: 'Library North to South',
      path: [
        [33.75252, -84.38667],
        [33.75236, -84.38677],
      ],
      in_osm: false,
      half_width: null,
      favor: null,
      ends: ['library-north', 'library-south'],
      stairs: true,
      penalty: 60,
      sort: 10,
      published: true,
      created_at: stamp,
      updated_at: stamp,
    }
    wrap(<ConnectionsView connections={[connection]} />)
    const table = screen.getByRole('table', { name: 'Skybridges and shortcuts' })
    expect(within(table).getByText('Indoor link')).toBeInTheDocument()
    expect(within(table).getByText(/Library North.*↔.*Library South/)).toBeInTheDocument()
    expect(within(table).getByText('Stairs')).toBeInTheDocument()

    fireEvent.click(within(table).getByRole('button', { name: 'Actions for The Link' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit The Link' })
    const points = within(dialog).getByLabelText(/Points/)
    expect(points).toHaveValue('33.75252, -84.38667\n33.75236, -84.38677')
    // Removing the last point leaves one, which the server would turn down
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove the last point' }))
    expect(points).toHaveValue('33.75252, -84.38667')
    fireEvent.change(points, { target: { value: '33.75252, -84.38667\n33.7524, -84.3867\n33.75236, -84.38677' } })
    await act(async () => fireEvent.submit(dialog.querySelector('form')!))
    const [id, sent] = actions.saveConnection.mock.calls[0] as [string, FormData]
    expect(id).toBe('k1')
    expect(sent.get('path')).toBe('33.75252, -84.38667\n33.7524, -84.3867\n33.75236, -84.38677')
    expect(sent.getAll('ends')).toEqual(['library-north', 'library-south'])
    expect([sent.get('kind'), sent.get('stairs'), sent.get('penalty')]).toEqual(['indoor', 'on', '60'])
  })

  it('Messages: shows unread ones first-class, opens one (marking it read), and offers a reply', async () => {
    const message = (over: Partial<ContactMessageRow>): ContactMessageRow => ({
      id: 'x1',
      name: 'Jordan Lee',
      email: 'jlee@student.gsu.edu',
      subject: 'Joining',
      body: 'How do I join?\nThanks!',
      read_at: null,
      read_by: null,
      created_at: stamp,
      ...over,
    })
    wrap(<MessagesView messages={[message({}), message({ id: 'x2', name: 'Sam Kim', subject: null, read_at: stamp, read_by: 'officer@gsu.edu' })]} />)
    const table = screen.getByRole('table', { name: 'Messages' })
    expect(within(table).getByText('New')).toBeInTheDocument()
    expect(within(table).getByText('Read')).toBeInTheDocument()

    await act(async () => fireEvent.click(within(table).getByRole('button', { name: /Jordan Lee \(unread\)/ })))
    expect(actions.markMessages).toHaveBeenCalledWith(['x1'], true)
    const dialog = screen.getByRole('dialog', { name: 'Joining' })
    expect(within(dialog).getByText(/How do I join\?/)).toBeInTheDocument()
    const reply = within(dialog).getByRole('link', { name: /Reply by email/ }).getAttribute('href')!
    expect(reply).toMatch(/^mailto:jlee@student\.gsu\.edu\?subject=Re%3A%20Joining&body=Hi%20Jordan/)
    expect(decodeURIComponent(reply)).toContain('> How do I join?\n> Thanks!')

    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }))
    await act(async () => {})
    expect(actions.markMessages).toHaveBeenLastCalledWith(['x1'], true)
  })

  it('Settings: officers see the list; only admins can change it', () => {
    const officers: OfficerRow[] = [
      { email: 'pres@gsu.edu', name: 'Jordan', title: 'President', role: 'admin', created_at: stamp },
      { email: 'treas@gsu.edu', name: 'Sam', title: 'Treasurer', role: 'officer', created_at: stamp },
    ]
    const settings = { id: 1, tagline: 'Hi', meeting_info: null, contact_email: null, instagram_url: null, updated_at: stamp, updated_by: null } as ClubSettingsRow
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

  it('Settings: club details can be saved only once they change, and undone', () => {
    const settings = { id: 1, tagline: 'Hi', meeting_info: null, contact_email: null, instagram_url: null, updated_at: stamp, updated_by: 'pres@gsu.edu' } as ClubSettingsRow
    wrap(<SettingsView settings={settings} officers={[]} me="pres@gsu.edu" isAdmin />)
    // Each part of Settings saves on its own; this is the club details' Save
    const save = within(screen.getByRole('heading', { name: 'Club details' }).closest('section')!).getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    expect(screen.getByText(/Last changed by pres/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tagline'), { target: { value: 'Hello' } })
    expect(save).toBeEnabled()
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo changes' }))
    expect(screen.getByLabelText('Tagline')).toHaveValue('Hi')
    expect(save).toBeDisabled()
  })

  it('Settings: lists admins first, and gives access from a dialog', async () => {
    const officers: OfficerRow[] = [
      { email: 'treas@gsu.edu', name: 'Sam', title: 'Treasurer', role: 'officer', created_at: stamp },
      { email: 'pres@gsu.edu', name: 'Jordan', title: 'President', role: 'admin', created_at: stamp },
    ]
    wrap(<SettingsView settings={null} officers={officers} me="pres@gsu.edu" isAdmin />)
    const roster = within(screen.getByRole('list', { name: 'Officers' })).getAllByRole('listitem')
    expect(roster[0]).toHaveTextContent('Jordan (you)')
    expect(roster[1]).toHaveTextContent('Sam')
    fireEvent.click(screen.getByRole('button', { name: 'Give access' }))
    const dialog = screen.getByRole('dialog', { name: 'Give someone access' })
    fireEvent.change(within(dialog).getByLabelText(/Google email/), { target: { value: 'new@gsu.edu' } })
    await act(async () => {
      fireEvent.submit(dialog.querySelector('form')!)
    })
    expect(actions.saveOfficer).toHaveBeenCalledTimes(1)
    expect((actions.saveOfficer.mock.calls[0] as [FormData])[0].get('email')).toBe('new@gsu.edu')
  })

  describe('editing officers', () => {
    const officers: OfficerRow[] = [
      { email: 'pres@gsu.edu', name: 'Jordan', title: 'President', role: 'admin', created_at: stamp },
      { email: 'treas@gsu.edu', name: 'Sam', title: 'Treasurer', role: 'officer', created_at: stamp },
    ]

    it('fills in the officer, keeps their email, and saves changes', async () => {
      wrap(<SettingsView settings={null} officers={officers} me="pres@gsu.edu" isAdmin />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit Sam' }))
      const dialog = screen.getByRole('dialog', { name: 'Edit Sam' })
      expect(within(dialog).getByLabelText(/Google email/)).toHaveAttribute('readonly')
      expect(within(dialog).getByLabelText('Title')).toHaveValue('Treasurer')
      fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Secretary' } })
      fireEvent.click(within(dialog).getByRole('radio', { name: 'Admin' }))
      await act(async () => {
        fireEvent.submit(dialog.querySelector('form')!)
      })
      expect(actions.saveOfficer).not.toHaveBeenCalled()
      const [email, form] = actions.updateOfficer.mock.calls[0] as [string, FormData]
      expect(email).toBe('treas@gsu.edu')
      expect(form.get('title')).toBe('Secretary')
      expect(form.get('role')).toBe('admin')
    })

    it('lets you edit your own details but not your role', () => {
      wrap(<SettingsView settings={null} officers={officers} me="pres@gsu.edu" isAdmin />)
      fireEvent.click(screen.getByRole('button', { name: 'Edit Jordan' }))
      const dialog = screen.getByRole('dialog', { name: 'Edit Jordan' })
      expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
      expect(within(dialog).getByText('You can’t change your own role; ask another admin.')).toBeInTheDocument()
      expect(new FormData(dialog.querySelector('form')!).get('role')).toBe('admin')
    })

    it('is for admins only', () => {
      wrap(<SettingsView settings={null} officers={officers} me="treas@gsu.edu" isAdmin={false} />)
      expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
    })
  })
})

describe('Homepage settings', () => {
  const row: HomepageRow = { id: 1, content: {}, updated_at: stamp, updated_by: null }

  it('starts from the built-in words and saves edits as one JSON copy', async () => {
    wrap(<HomepageView row={row} />)
    const title = screen.getByLabelText('Title', { selector: 'input[value="Survive. Engage. Graduate."]' })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.change(title, { target: { value: 'Welcome, Panthers' } })
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    const form = actions.saveHomepage.mock.calls[0][0] as FormData
    expect(JSON.parse(form.get('content') as string).hero.title).toBe('Welcome, Panthers')
  })

  it('hides a section', () => {
    wrap(<HomepageView row={row} />)
    fireEvent.click(screen.getAllByRole('switch', { name: 'Show' })[0])
    expect(screen.getByText('Hidden')).toBeInTheDocument()
  })

  it('says when the table is missing', () => {
    wrap(<HomepageView row={null} />)
    expect(screen.getByText(/homepage table isn’t set up yet/)).toBeInTheDocument()
  })
})

describe('Homepage section names', () => {
  it('renames a section in the dashboard', () => {
    wrap(<HomepageView row={{ id: 1, content: {}, updated_at: stamp, updated_by: null }} />)
    fireEvent.change(screen.getAllByLabelText(/Section name/)[0], { target: { value: 'Our mission' } })
    expect(screen.getByRole('heading', { name: /Our mission/ })).toBeInTheDocument()
  })
})

describe('Tab titles', () => {
  it('shows the site’s own as placeholders, previews a change, and saves the list', async () => {
    const rows: PageMetaRow[] = [{ path: '/map', title: 'Map of GSU', description: null, updated_at: stamp, updated_by: 'jo@gsu.edu' }]
    wrap(<TitlesView rows={rows} managed={[{ id: 'pg1', slug: 'about', title: 'About CSEG' }]} />)
    const home = screen.getByRole('region', { name: 'Homepage' })
    fireEvent.change(within(home).getByLabelText(/^Title/), { target: { value: 'CSEG at Georgia State' } })
    expect(within(within(home).getByLabelText('How Homepage shows in search')).getByText('CSEG at Georgia State | Campus Survival and Engagement Group')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Campus map' })).getByLabelText(/^Title/)).toHaveValue('Map of GSU')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    const meta = JSON.parse((actions.savePageMeta.mock.lastCall?.[0] as FormData).get('meta') as string)
    expect(meta.find((m: { path: string }) => m.path === '/').title).toBe('CSEG at Georgia State')
  })

  it('shows what a page published from Pages really says, with nothing to type that wouldn’t show', () => {
    wrap(<TitlesView rows={[]} managed={[{ id: 'pg1', slug: 'about', title: 'About CSEG', description: 'Who we are' }]} />)
    const about = screen.getByRole('region', { name: 'About' })
    expect(within(about).getByText('About CSEG | Campus Survival and Engagement Group')).toBeInTheDocument()
    expect(within(about).getByText('Who we are')).toBeInTheDocument()
    expect(within(about).getByRole('link', { name: 'Edit in Pages' })).toHaveAttribute('href', '/dashboard/pages/pg1')
    expect(within(about).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('keeps the title saved for a published page when saving the others', async () => {
    const rows: PageMetaRow[] = [{ path: '/about', title: 'For later', description: null, updated_at: stamp, updated_by: null }]
    wrap(<TitlesView rows={rows} managed={[{ id: 'pg1', slug: 'about', title: 'About CSEG' }]} />)
    fireEvent.change(within(screen.getByRole('region', { name: 'Homepage' })).getByLabelText(/^Title/), { target: { value: 'Home base' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    const meta = JSON.parse((actions.savePageMeta.mock.lastCall?.[0] as FormData).get('meta') as string)
    expect(meta.find((m: { path: string }) => m.path === '/about').title).toBe('For later')
  })

  it('says what to shorten instead of failing out of sight', () => {
    wrap(<TitlesView rows={[]} managed={[]} />)
    const events = screen.getByRole('region', { name: 'Events' })
    fireEvent.change(within(events).getByLabelText(/^Title/), { target: { value: 'x'.repeat(61) } })
    expect(within(events).getByText('Keep it under 60 characters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByText('Shorten 1 field to save')).toBeInTheDocument()
  })

  it('warns when search would cut a title off', () => {
    wrap(<TitlesView rows={[]} managed={[]} />)
    const events = screen.getByRole('region', { name: 'Events' })
    fireEvent.change(within(events).getByLabelText(/^Title/), { target: { value: 'Everything happening at CSEG this term' } })
    expect(within(events).getByText(/search results may cut it off/)).toBeInTheDocument()
  })

  it('goes back to the site’s own for one page', () => {
    const rows: PageMetaRow[] = [{ path: '/map', title: 'Map of GSU', description: 'Find it', updated_at: stamp, updated_by: null }]
    wrap(<TitlesView rows={rows} managed={[]} />)
    const map = screen.getByRole('region', { name: 'Campus map' })
    expect(within(map).getByText('Changed')).toBeInTheDocument()
    fireEvent.click(within(map).getByRole('button', { name: /Use the site/ }))
    expect(within(map).getByLabelText(/^Title/)).toHaveValue('')
    expect(within(map).getByText('Unsaved')).toBeInTheDocument()
  })

  it('tidies spaces when saving, so nothing still looks unsaved', async () => {
    wrap(<TitlesView rows={[]} managed={[]} />)
    const events = screen.getByRole('region', { name: 'Events' })
    fireEvent.change(within(events).getByLabelText(/^Title/), { target: { value: '  Whats   on ' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(within(events).getByLabelText(/^Title/)).toHaveValue('Whats on')
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('says when the table is missing', () => {
    wrap(<TitlesView rows={null} managed={[]} />)
    expect(screen.getByText(/page titles table isn’t set up yet/)).toBeInTheDocument()
  })
})
