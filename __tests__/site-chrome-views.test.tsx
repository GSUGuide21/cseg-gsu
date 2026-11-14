import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'

import { NotificationProvider } from '@/components'
import { BUILT_IN_CHROME } from '@/lib/siteChrome'
import type { SiteChromeRow } from '@/lib/supabase/types'

import { Header } from '@/globals/Header'

import { navFor } from '../app/(dashboard)/dashboard/DashboardShell'
import { ChromePartView } from '../app/(dashboard)/dashboard/site/ChromePartView'

const refresh = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh, replace: jest.fn(), push: jest.fn() }), usePathname: () => '/dashboard/site/navigation' }))

jest.mock('../app/lib/dashboard/actions', () => ({
  saveSiteChrome: jest.fn(async () => ({ ok: true, message: 'Saved and on the site' })),
}))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const actions = require('../app/lib/dashboard/actions') as Record<string, jest.Mock>

jest.setTimeout(20_000)

const wrap = (ui: ReactNode) => render(<NotificationProvider>{ui}</NotificationProvider>)
const row: SiteChromeRow = { id: 1, navigation: {}, header: {}, footer: {}, search: {}, updated_at: '2026-11-13T15:00:00Z', updated_by: null }

const sent = () => {
  const form = actions.saveSiteChrome.mock.calls[0][0] as FormData
  return { part: form.get('part'), content: JSON.parse(form.get('content') as string) }
}
const save = () => act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })))

/** Picks an option of a Select by its name */
const pick = (select: string, option: RegExp) => {
  fireEvent.keyDown(screen.getByRole('combobox', { name: select }), { key: 'ArrowDown' })
  fireEvent.click(screen.getByRole('option', { name: option }))
}

/** Moves an item of a Sortable with the keyboard: pick it up, arrow, drop */
const move = (item: string, key: 'ArrowUp' | 'ArrowDown') => {
  const handle = () => screen.getByRole('button', { name: `Reorder ${item}` })
  fireEvent.keyDown(handle(), { key: ' ' })
  fireEvent.keyDown(handle(), { key })
  fireEvent.keyDown(handle(), { key: ' ' })
}

describe('Site chrome, in the dashboard', () => {
  beforeEach(() => jest.clearAllMocks())

  it('is its own sidebar section: Navigation, Search, Header, Footer', () => {
    const section = navFor(0, 0, 'editor').find((s) => s.label === 'Menus & layout')
    expect(section?.items.map((i) => [i.label, i.href])).toEqual([
      ['Navigation', '/dashboard/site/navigation'],
      ['Search', '/dashboard/site/search'],
      ['Header', '/dashboard/site/header'],
      ['Footer', '/dashboard/site/footer'],
    ])
  })

  it('Navigation: edits a menu’s links, saying where the menu shows', async () => {
    wrap(<ChromePartView part="navigation" row={row} />)
    expect(screen.getByRole('button', { name: 'Main menu', pressed: true })).toBeInTheDocument()
    expect(screen.getByText('Header: Main menu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    move('Events', 'ArrowUp')
    fireEvent.click(screen.getByRole('button', { name: 'Remove Contact' }))
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await save()

    const { part, content } = sent()
    expect(part).toBe('navigation')
    expect(content.menus[0].links.map((l: { label: string }) => l.label)).toEqual(['Home', 'Events', 'About', 'Map', 'Resources', 'Join'])
    expect(content.menus).toHaveLength(BUILT_IN_CHROME.navigation.menus.length)
    expect(refresh).toHaveBeenCalled()
  })

  it('Navigation: opens the menu it’s asked for, and adds a new one that isn’t on the site yet', async () => {
    wrap(<ChromePartView part="navigation" row={row} initialMenu="footer-campus" />)
    expect(screen.getByRole('button', { name: 'Campus', pressed: true })).toBeInTheDocument()
    expect(screen.getByText('Footer: Link columns')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'New menu' }))
    expect(screen.getByText(/Not on the site yet/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Menu name/), { target: { value: 'Legal' } })
    fireEvent.change(screen.getByLabelText('Words'), { target: { value: 'Privacy' } })
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: '/privacy' } })
    await save()

    const added = sent().content.menus.at(-1)
    expect(added).toMatchObject({ name: 'Legal', links: [{ href: '/privacy', label: 'Privacy' }] })
    expect(added.id).toMatch(/^menu-[a-z0-9]+$/)
  })

  it('Header: picks the menu for its location, with a preview, and saves the switches', async () => {
    wrap(<ChromePartView part="header" row={row} />)
    const preview = screen.getByRole('region', { name: 'Header preview' })
    expect(within(preview).getByText('Events')).toBeInTheDocument()
    // The button's own page isn't in the menu twice
    expect(within(preview).getAllByText('Join')).toHaveLength(1)

    pick('Main menu', /^Campus/)
    expect(within(preview).getByText('Campus map')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit this menu’s links' })).toHaveAttribute('href', '/dashboard/site/navigation?menu=footer-campus')
    fireEvent.click(screen.getByRole('switch', { name: 'Search button' }))
    await save()
    expect(sent()).toEqual({ part: 'header', content: { menu: 'footer-campus', search: false, themeToggle: true, cta: { label: 'Join', href: '/join' } } })
  })

  it('Footer: orders its columns, and gives the bottom bar a menu', async () => {
    wrap(<ChromePartView part="footer" row={row} />)
    const columns = screen.getByRole('list', { name: 'Footer columns, in order' })
    expect(within(columns).getAllByRole('combobox')).toHaveLength(5)
    // Every built-in footer menu is a column, so only the main menu is left to add
    fireEvent.click(screen.getByRole('button', { name: 'Remove the Officers column' }))
    move('the Campus column', 'ArrowUp')
    pick('Bottom bar', /^Officers/)
    expect(within(screen.getByRole('region', { name: 'Footer preview' })).getByText('Dashboard')).toBeInTheDocument()
    await save()

    const { part, content } = sent()
    expect(part).toBe('footer')
    expect(content.columns).toEqual(['footer-campus', 'footer-about', 'footer-resources', 'footer-get-involved'])
    expect(content.bottom).toBe('footer-officers')
  })

  it('Search: reorders its suggestions by their grips', async () => {
    wrap(<ChromePartView part="search" row={{ ...row, search: { suggestions: ['parking', 'food', 'aid'] } }} />)
    move('aid', 'ArrowUp')
    fireEvent.click(screen.getByRole('button', { name: 'Remove parking' }))
    await save()
    expect(sent().content.suggestions).toEqual(['aid', 'food'])
  })

  it('Search: shows a field’s problem from the server', async () => {
    actions.saveSiteChrome.mockResolvedValueOnce({ ok: false, errors: { title: 'Add a title.' } })
    wrap(<ChromePartView part="search" row={row} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add a suggestion' }))
    fireEvent.change(screen.getByLabelText('Suggestion 1'), { target: { value: 'parking' } })
    await save()
    expect(sent().content.suggestions).toEqual(['parking'])
    expect(screen.getByText('Add a title.')).toBeInTheDocument()
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    // Put back, the form starts over from what was saved
    fireEvent.click(screen.getByRole('button', { name: 'Undo changes' }))
    expect(screen.queryByLabelText('Suggestion 1')).not.toBeInTheDocument()
  })

  it('brings back a part as it was before its last save, to save again', async () => {
    const before = { ...BUILT_IN_CHROME.search, title: 'Search CSEG' }
    wrap(<ChromePartView part="search" row={{ ...row, search: { title: 'Oops' }, previous: { search: before } }} />)
    expect(screen.getByLabelText('Title', { selector: 'input[value="Oops"]' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bring back the previous version' }))
    expect(screen.getByLabelText('Title', { selector: 'input[value="Search CSEG"]' })).toBeInTheDocument()
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await save()
    expect(sent().content.title).toBe('Search CSEG')
  })

  it('has no previous version to bring back before the first save', () => {
    wrap(<ChromePartView part="header" row={{ ...row, previous: { search: {} } }} />)
    expect(screen.getByRole('button', { name: 'Bring back the previous version' })).toBeDisabled()
  })

  it('keeps the rarely used screens under Advanced, folded, with a line saying what each section holds', () => {
    const nav = navFor(0, 0, 'officer')
    const advanced = nav.find((s) => s.label === 'Advanced')
    expect(advanced).toMatchObject({ collapsible: true, defaultOpen: false })
    expect(advanced?.items.map((i) => i.label)).toEqual(['Page titles', 'Old links', 'Walking shortcuts'])
    for (const section of nav.filter((s) => s.label)) expect(section.description).toBeTruthy()
  })

  it('says when the table is missing', () => {
    wrap(<ChromePartView part="footer" row={null} />)
    expect(screen.getByText(/table isn’t set up yet/)).toBeInTheDocument()
  })
})

describe('the header, on a page with its own menu', () => {
  const guide = [{ href: '/guides/parking', label: 'Parking' }, { href: '/guides/food', label: 'Food' }]
  const menuLabels = () => within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link').map((a) => a.textContent)

  it('shows that menu instead of the site’s, and the site’s everywhere else', () => {
    // The page being viewed is the mocked path
    const { unmount } = render(<Header pageMenus={{ '/dashboard/site/navigation': guide }} />)
    expect(menuLabels()).toEqual(expect.arrayContaining(['Parking', 'Food']))
    expect(menuLabels()).not.toContain('Events')
    unmount()

    render(<Header pageMenus={{ '/guides': guide }} />)
    expect(menuLabels()).toContain('Events')
    expect(menuLabels()).not.toContain('Parking')
  })
})
