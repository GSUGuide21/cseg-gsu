import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { Mail } from 'lucide-react'

import { SearchOverlay, type QuickItem } from '../app/components'
import { groupResults, markMatches, searchContent, searchWithTotal, searchWords, type SearchEntry, type SearchResult } from '../app/lib/search'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: jest.fn(), replace: jest.fn() }), usePathname: () => '/' }))

const ENTRIES: SearchEntry[] = [
  { title: 'Fall social', href: '/events#event-fall', kind: 'Event', summary: 'Food and games', date: '2999-10-31T22:00:00Z', image: 'https://x.test/flyer.png', meta: 'Student Center East' },
  { title: 'Spring social', href: '/events#event-spring', kind: 'Event', summary: 'Last term', date: '2020-04-01T22:00:00Z' },
  { title: 'Parking guide', href: '/guides/parking', kind: 'Page', summary: 'Decks K, M, and T' },
  { title: 'Instagram', href: 'https://www.instagram.com/cseg_gsu/', kind: 'Social', summary: 'Event announcements and photos.', icon: 'instagram' },
  { title: 'Student Center East', href: '/map?place=sce', kind: 'On the map', summary: 'A hub', keywords: ['sce', 'courtyard'] },
]

describe('Searching', () => {
  it('finds a place by its other names, and keeps what a result shows', () => {
    const [hit] = searchContent(ENTRIES, 'sce')
    expect(hit).toMatchObject({ title: 'Student Center East', kind: 'On the map' })
    const [flyer] = searchContent(ENTRIES, 'fall')
    expect(flyer).toMatchObject({ image: 'https://x.test/flyer.png', date: '2999-10-31T22:00:00Z', meta: 'Student Center East' })
    expect(searchContent(ENTRIES, 'instagram')[0].icon).toBe('instagram')
    // Its words aren't sent along: only what's shown
    expect(flyer).not.toHaveProperty('text')
    expect(searchContent(ENTRIES, 'sce')[0]).not.toHaveProperty('keywords')
  })

  it('matches whole words: plurals, word starts, and typos, never the middle of a word', () => {
    const entries: SearchEntry[] = [
      { title: 'Student resources', href: '/resources', kind: 'Page' },
      { title: 'Creative Media Industries', href: '/cmii', kind: 'On the map' },
      { title: 'Places to eat', href: '/eat', kind: 'Page' },
      { title: 'University Library', href: 'https://library.test', kind: 'Resource' },
      { title: 'Café Lucia', href: '/eat#lucia', kind: 'Place to eat' },
      { title: 'PantherCard', href: 'https://card.test', kind: 'Resource', summary: 'Your student ID card.' },
      { title: 'Panther Picks', href: '/picks', kind: 'Page', summary: 'Places students like.' },
    ]
    const titles = (q: string) => searchContent(entries, q).map((r) => r.title)
    // A plural finds the same as its singular (each a little keener on its own form, where they tie)
    expect(titles('students').sort()).toEqual(titles('student').sort())
    expect(titles('students')[0]).toBe('Student resources')
    // "eat" is a word, not the middle of "creative"
    expect(titles('eat')).toEqual(['Places to eat'])
    // The start of a word, and a typo in a longer one
    expect(titles('lib')).toEqual(['University Library'])
    expect(titles('resorces')).toEqual(['Student resources'])
    expect(titles('librray')).toEqual(['University Library'])
    // Short words have to be right: "ea" isn't a typo of anything
    expect(titles('eta')).toEqual([])
    // Accents don't matter
    expect(titles('cafe')).toEqual(['Café Lucia'])
    // Words typed apart that are one word in a title
    expect(titles('panthr card')[0]).toBe('PantherCard')
  })

  it('lifts a kind it’s told to, and counts every match by kind', () => {
    const entries: SearchEntry[] = [
      { title: 'Student Center', href: 'https://sc.test', kind: 'Resource' },
      { title: 'Student Center', href: '/student-center', kind: 'Page' },
      { title: 'Student Center East', href: '/map?place=sce', kind: 'On the map' },
    ]
    const found = searchWithTotal(entries, 'student center', { boost: { Page: 4, Resource: -1 }, limit: 2 })
    expect(found.results.map((r) => r.kind)).toEqual(['Page', 'Resource'])
    expect(found).toMatchObject({ total: 3, kinds: { Page: 1, Resource: 1, 'On the map': 1 } })
    expect(searchWithTotal(entries, 'student center', { kind: 'On the map' })).toMatchObject({ total: 1, results: [{ title: 'Student Center East' }] })
  })

  it('reads a search as its words, each once', () => {
    expect(searchWords('  Fall  fall SOCIAL ')).toEqual(['fall', 'social'])
  })

  it('marks the search’s words where they appear, whatever their case', () => {
    expect(markMatches('Fall social, the social of fall', ['social', 'fall'])).toEqual([
      { text: 'Fall', match: true },
      { text: ' ', match: false },
      { text: 'social', match: true },
      { text: ', the ', match: false },
      { text: 'social', match: true },
      { text: ' of ', match: false },
      { text: 'fall', match: true },
    ])
    // Only words count, as the search reads them: "c++" is the word "c"
    expect(markMatches('C++ (intro)', ['c++', '(intro)']).filter((p) => p.match).map((p) => p.text)).toEqual(['C', 'intro'])
    // A word matched by its start has that much marked; never the middle of a word
    expect(markMatches('Library and creative', ['lib', 'eat'])).toEqual([
      { text: 'Lib', match: true },
      { text: 'rary and creative', match: false },
    ])
    // A plural, or a typo, marks the whole word
    expect(markMatches('Students and resources', ['student', 'resorces']).filter((p) => p.match).map((p) => p.text)).toEqual(['Students', 'resources'])
  })

  it('groups results by kind, in the order given', () => {
    const results = [...searchContent(ENTRIES, 'social'), ...searchContent(ENTRIES, 'instagram')]
    expect(groupResults(results, ['Social', 'Event']).map((g) => [g.kind, g.results.length])).toEqual([
      ['Social', 1],
      ['Event', 2],
    ])
  })
})

const QUICK: QuickItem[] = [
  { id: 'events', group: 'Popular', label: 'Events', description: 'What’s coming up.', href: '/events' },
  { id: 'join', group: 'Popular', label: 'Join CSEG', href: '/join', keywords: ['member'] },
  { id: 'mail', group: 'Popular', label: 'Write to us', onSelect: jest.fn(), icon: <Mail /> },
]

/** A search that answers from ENTRIES, a moment later */
const searchOf = () => jest.fn(async (q: string) => searchContent(ENTRIES, q) as SearchResult[])

const open = (props: Partial<React.ComponentProps<typeof SearchOverlay>> = {}) => {
  const onClose = jest.fn()
  const onNavigate = jest.fn()
  const search = props.search ?? searchOf()
  const view = render(
    <SearchOverlay
      open
      onClose={onClose}
      search={search}
      quick={QUICK}
      kinds={{ Event: { label: 'Events', dated: true, tone: 'brand' }, Social: { label: 'Socials' } }}
      icons={{ instagram: <span data-testid="ig-icon" /> }}
      label="Search the site"
      suggestions={['parking', 'food']}
      recentKey="test-recent"
      onNavigate={onNavigate}
      {...props}
    />
  )
  return { ...view, onClose, onNavigate, search }
}

const box = () => screen.getByRole('combobox', { name: 'Search the site' })
const options = () => screen.queryAllByRole('option')
const names = () => options().map((o) => o.querySelector('[data-title]')?.textContent)
const type = async (text: string) => {
  fireEvent.change(box(), { target: { value: text } })
  await act(async () => {
    jest.advanceTimersByTime(200)
  })
}

describe('The full-screen search', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.localStorage.clear()
    push.mockClear()
  })
  afterEach(() => jest.useRealTimers())

  it('suggests where to go before anything’s typed, with searches to try', () => {
    open()
    expect(screen.getByRole('dialog', { name: 'Search the site' })).toBeInTheDocument()
    expect(names()).toEqual(['Events', 'Join CSEG', 'Write to us'])
    expect(screen.getByText('Suggested')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'parking' })).toBeInTheDocument()
  })

  it('asks once typing pauses, and shows every result as a card, best first', async () => {
    const { search } = open()
    fireEvent.change(box(), { target: { value: 'soc' } })
    fireEvent.change(box(), { target: { value: 'social' } })
    expect(search).not.toHaveBeenCalled()
    await type('social')
    expect(search).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledWith('social', expect.any(AbortSignal))
    expect(names()).toEqual(['Fall social', 'Spring social'])
    expect(screen.getByText('2 results for “social”')).toBeInTheDocument()
    // They're under a heading for their kind; a past event says so; an event's flyer stands for it
    expect(screen.getByRole('group', { name: 'Events 2' })).toContainElement(options()[0])
    expect(options()[0]).not.toHaveTextContent(/past/i)
    expect(options()[1]).toHaveTextContent(/past/i)
    expect(options()[0].querySelector('img')).toHaveAttribute('src', 'https://x.test/flyer.png')
    // The search's words are marked
    expect(options()[0].querySelector('mark')).toHaveTextContent('social')
  })

  it('moves the highlight with the arrow keys while the cursor stays in the box, and opens it with Enter', async () => {
    const { onNavigate, onClose } = open()
    await type('social')
    expect(box()).toHaveAttribute('aria-activedescendant', options()[0].id)
    expect(options()[0]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(box(), { key: 'ArrowDown' })
    expect(box()).toHaveAttribute('aria-activedescendant', options()[1].id)
    // Round again from the last
    fireEvent.keyDown(box(), { key: 'ArrowDown' })
    expect(box()).toHaveAttribute('aria-activedescendant', options()[0].id)
    fireEvent.keyDown(box(), { key: 'ArrowUp' })
    expect(box()).toHaveFocus()
    fireEvent.submit(box())
    expect(onClose).toHaveBeenCalled()
    expect(onNavigate).toHaveBeenCalledWith('/events#event-spring')
    // The search is remembered for next time
    expect(JSON.parse(window.localStorage.getItem('test-recent')!)).toEqual(['social'])
  })

  it('counts every match on its chips, and asks for one kind’s own best when its chip is picked', async () => {
    const [fall, spring] = searchContent(ENTRIES, 'social')
    const [insta] = searchContent(ENTRIES, 'instagram')
    const tiktok = { ...insta, title: 'TikTok', href: 'https://tiktok.test/cseg', icon: null }
    // The search sent three, but says five matched: three events and two socials
    const search = jest.fn(async (_q: string, _s: AbortSignal, kind?: string) => (kind === 'Social' ? { results: [insta, tiktok], total: 2 } : { results: [fall, spring, insta], total: 5, kinds: { Event: 3, Social: 2 } }))
    open({ search })
    await type('social')
    const chips = within(screen.getByRole('group', { name: 'Filter results' }))
    expect(chips.getAllByRole('button').map((b) => b.textContent)).toEqual(['All 5', 'Events 3', 'Socials 2'])
    expect(screen.getByText('Top 3 of 5 results for “social”')).toBeInTheDocument()

    // Two socials matched, one was sent: picking the chip asks for them
    await act(async () => {
      fireEvent.click(chips.getByRole('button', { name: /^Socials/ }))
    })
    expect(search).toHaveBeenLastCalledWith('social', expect.any(AbortSignal), 'Social')
    expect(names()).toEqual(['Instagram', 'TikTok'])
    // Another site's opens in a new tab; its icon is its own
    expect(screen.getByTestId('ig-icon')).toBeInTheDocument()
    const opened = jest.spyOn(window, 'open').mockImplementation(() => null)
    fireEvent.click(within(options()[0]).getByRole('link'))
    expect(opened).toHaveBeenCalledWith('https://www.instagram.com/cseg_gsu/', '_blank', 'noopener,noreferrer')
    opened.mockRestore()
  })

  it('doesn’t ask again for a kind it already has all of', async () => {
    const search = jest.fn(async () => ({ results: searchContent(ENTRIES, 'social'), total: 2, kinds: { Event: 2 } }))
    open({ search })
    await type('social')
    fireEvent.click(within(screen.getByRole('group', { name: 'Filter results' })).getByRole('button', { name: /^Events/ }))
    expect(search).toHaveBeenCalledTimes(1)
    expect(names()).toEqual(['Fall social', 'Spring social'])
  })

  it('leaves out a shortcut that goes where a result does', async () => {
    const search = jest.fn(async () => [{ title: 'Join CSEG', href: '/join', kind: 'Page', snippet: 'How to become a member.' }])
    open({ search })
    await type('join')
    expect(names()).toEqual(['Join CSEG'])
    expect(screen.getByRole('group', { name: 'Page 1' })).toContainElement(options()[0])
  })

  it('adds what’s on to its suggestions, under its own heading', async () => {
    const [fall] = searchContent(ENTRIES, 'fall')
    await act(async () => {
      open({ suggest: jest.fn(async () => [fall]) })
    })
    expect(names()).toEqual(['Events', 'Join CSEG', 'Write to us', 'Fall social'])
  })

  it('finds what can be done by name too, and does it', async () => {
    const { onClose } = open()
    await type('write')
    expect(names()[0]).toBe('Write to us')
    fireEvent.click(within(options()[0]).getByRole('link'))
    expect(QUICK[2].onSelect).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('says when nothing’s found, offering other searches, and when the search fails', async () => {
    open({ emptyTitle: 'No luck', emptyText: 'Try fewer words.' })
    await type('unicorns')
    expect(screen.getByText(/nothing matches/)).toHaveTextContent('No luck: nothing matches unicorns.')
    fireEvent.click(screen.getByRole('button', { name: 'parking' }))
    await act(async () => {
      jest.advanceTimersByTime(200)
    })
    expect(names()).toEqual(['Parking guide'])
  })

  it('says so when the search doesn’t go through, still finding what needs no asking', async () => {
    open({ search: jest.fn(async () => Promise.reject(new Error('offline'))) })
    await type('join')
    expect(screen.getByText(/didn’t go through\. Check your connection/)).toBeInTheDocument()
    expect(names()).toEqual(['Join CSEG'])
  })

  it('shows what needs no asking at once, before the server answers', async () => {
    const never = jest.fn(() => new Promise<SearchResult[]>(() => {}))
    open({ search: never })
    fireEvent.change(box(), { target: { value: 'member' } })
    expect(names()).toEqual(['Join CSEG'])
  })

  it('offers recent searches, to run again or clear', async () => {
    window.localStorage.setItem('test-recent', JSON.stringify(['parking', 'social']))
    open()
    fireEvent.click(screen.getByRole('button', { name: 'social' }))
    await act(async () => {
      jest.advanceTimersByTime(200)
    })
    expect(box()).toHaveValue('social')
    expect(names()).toEqual(['Fall social', 'Spring social'])
  })

  it('closes from its button', () => {
    const { onClose } = open()
    fireEvent.click(screen.getByRole('button', { name: 'Close search' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('The site’s search button', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SiteSearch } = require('../app/globals/Search/SiteSearch') as typeof import('../app/globals/Search/SiteSearch')

  it('is a link to the search page that opens the full-screen search instead', () => {
    render(<SiteSearch />)
    const link = screen.getByRole('link', { name: 'Search the site' })
    expect(link).toHaveAttribute('href', '/search')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    fireEvent.click(link)
    expect(screen.getByRole('combobox', { name: 'Search the site' })).toBeInTheDocument()
  })

  it('opens with / or Ctrl+K, but not while someone’s typing elsewhere', () => {
    render(
      <>
        <input aria-label="Name" />
        <SiteSearch />
      </>
    )
    fireEvent.keyDown(screen.getByLabelText('Name'), { key: '/' })
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: '/' })
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('opens with Ctrl+K', () => {
    render(<SiteSearch />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('leaves a Ctrl-click to the browser, for the search page in a new tab', () => {
    render(<SiteSearch />)
    const link = screen.getByRole('link', { name: 'Search the site' })
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
    link.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(false)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
