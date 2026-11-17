import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

import { AppShell } from '../app/components'
import { DashboardShell, navFor } from '../app/(dashboard)/dashboard/DashboardShell'

const push = jest.fn()
let pathname = '/dashboard/posts/42'
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: jest.fn(), replace: jest.fn() }), usePathname: () => pathname }))

const labels = (role: 'editor' | 'officer' | 'admin' = 'officer') => navFor(3, 2, role).map((s) => [s.label ?? '', s.items.map((i) => i.label)])
const hrefs = (role: 'editor' | 'officer' | 'admin') => navFor(0, 0, role).flatMap((s) => s.items.map((i) => i.href))

describe('The dashboard’s sidebar', () => {
  it('runs from what’s waiting on you, through the club and what it publishes, to the site and its settings', () => {
    expect(labels()).toEqual([
      ['', ['Overview', 'Messages', 'Join requests']],
      ['Club', ['Members', 'Events', 'Dues', 'Minutes']],
      ['Publish', ['Posts', 'Pages', 'Presentations', 'Photo albums', 'Library', 'Opportunities']],
      ['Engage', ['Polls and quizzes', 'Forms']],
      ['About the club', ['Executives', 'Affiliates', 'Sponsors', 'Testimonials', 'Questions']],
      ['Campus guide', ['Map', 'Tours', 'Walking shortcuts', 'Eateries', 'Resources', 'Picks']],
      ['Site', ['Homepage', 'Navigation', 'Header', 'Footer', 'Search', 'Media']],
      ['Advanced', ['Page titles', 'Old links']],
      ['', ['Settings', 'View the site']],
    ])
  })

  it('shows what’s waiting at the top, and keeps no section longer than six', () => {
    const top = navFor(3, 2, 'officer')[0].items
    expect(top.map((i) => [i.label, i.count])).toEqual([
      ['Overview', undefined],
      ['Messages', 3],
      ['Join requests', 2],
    ])
    for (const section of navFor(0, 0, 'officer')) expect(section.items.length).toBeLessThanOrEqual(6)
  })

  it('has a line saying what each headed section holds', () => {
    for (const section of navFor(0, 0, 'officer').filter((s) => s.label)) expect(section.description).toBeTruthy()
  })

  it('reaches every screen of the dashboard, each once', () => {
    const all = hrefs('admin')
    expect(new Set(all).size).toBe(all.length)
    // Every folder under /dashboard with a screen of its own
    const root = join(__dirname, '..', 'app', '(dashboard)', 'dashboard')
    const screens = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(root, d.name, 'page.tsx')))
      .map((d) => d.name)
    // The site's own screens are reached at /dashboard/site/<part>
    for (const name of screens.filter((n) => n !== 'site')) expect(all).toContain(`/dashboard/${name}`)
    for (const part of ['navigation', 'header', 'footer', 'search']) expect(all).toContain(`/dashboard/site/${part}`)
  })

  it('starts open what each role works in most, and the rest folded', () => {
    const open = (role: 'editor' | 'officer' | 'admin') => navFor(0, 0, role).filter((s) => s.collapsible && s.defaultOpen).map((s) => s.label)
    expect(open('officer')).toEqual(['Club', 'Publish'])
    expect(open('admin')).toEqual(['Club', 'Publish'])
    expect(open('editor')).toEqual(['Publish', 'Site'])
    // Every headed section folds
    for (const section of navFor(0, 0, 'officer').filter((s) => s.label)) expect(section.collapsible).toBe(true)
  })

  it('keeps what’s about people from an editor, leaving Events in Club', () => {
    expect(labels('editor')[0]).toEqual(['', ['Overview']])
    expect(labels('editor')[1]).toEqual(['Club', ['Events']])
  })
})

describe('Its headings', () => {
  // The page being viewed is a post, in Publish
  const nav = [
    { label: 'Club', description: 'Running the club.', collapsible: true, items: [{ label: 'Members', href: '/dashboard/members' }] },
    { label: 'Publish', description: 'What goes on the site.', collapsible: true, items: [{ label: 'Posts', href: '/dashboard/posts' }] },
  ]
  const side = () => screen.getAllByRole('navigation', { name: 'Dashboard' })[0]
  const heading = (name: RegExp) => within(side()).getByRole('button', { name })

  beforeEach(() => {
    window.localStorage.clear()
    pathname = '/dashboard/posts/42'
  })

  it('say what each section holds, read after the heading’s name', () => {
    render(<AppShell nav={nav}>Page</AppShell>)
    expect(heading(/^Club/)).toHaveAccessibleDescription('Running the club.')
  })

  it('mark a folded section that holds the page being viewed, so it can be found again', () => {
    render(<AppShell nav={nav}>Page</AppShell>)
    // Arriving opened it; folded again, its heading says the page is in there
    expect(heading(/^Publish/)).toHaveAttribute('aria-expanded', 'true')
    expect(heading(/^Publish/)).not.toHaveTextContent('page you’re on')
    fireEvent.click(heading(/^Publish/))
    expect(heading(/^Publish/)).toHaveAccessibleName('Publish, the page you’re on is in here')
    expect(heading(/^Club/)).toHaveAccessibleName('Club')
  })
})

describe('The top bar’s New menu', () => {
  const officer = { email: 'pres@gsu.edu', name: 'Jordan Lee', title: 'President', role: 'officer' as const }

  beforeEach(() => {
    push.mockClear()
    window.localStorage.clear()
  })

  it('starts a post, page, presentation, or member from any page', async () => {
    render(
      <DashboardShell officer={officer} avatarUrl={null}>
        Page
      </DashboardShell>
    )
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'New' })))
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Post', 'Page', 'Presentation', 'Member'])
    await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: 'Presentation' })))
    expect(push).toHaveBeenCalledWith('/dashboard/presentations/new')
  })

  it('leaves out adding a member for an editor', async () => {
    render(
      <DashboardShell officer={{ ...officer, role: 'editor' }} avatarUrl={null}>
        Page
      </DashboardShell>
    )
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'New' })))
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Post', 'Page', 'Presentation'])
  })
})
