import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { FC } from 'react'

import { SortFilterBar, useSortFilter, type SortFilterField, type SortOption } from '@/components'

import { PostList, type PostSummary } from '../app/globals/PostList'

interface Row {
  name: string
  major: string | null
  tags?: string[]
  joined: string | null
}

const ROWS: Row[] = [
  { name: 'Sam', major: 'Biology', tags: ['new'], joined: '2026-03-01' },
  { name: 'Avery', major: 'Nursing', tags: ['new', 'officer'], joined: null },
  { name: 'Jordan', major: 'Biology', joined: '2026-05-01' },
]
const FILTERS: SortFilterField<Row>[] = [
  { id: 'major', label: 'Major', value: (r) => r.major },
  { id: 'tags', label: 'Tags', value: (r) => r.tags },
]
const SORTS: SortOption<Row>[] = [
  { id: 'name', label: 'Name', value: (r) => r.name },
  { id: 'joined', label: 'Newest', value: (r) => r.joined, direction: 'descending' },
]
const search = (r: Row) => [r.name, r.major]

const Example: FC<{ syncUrl?: boolean }> = ({ syncUrl }) => {
  const list = useSortFilter({ rows: ROWS, filters: FILTERS, sorts: SORTS, search, syncUrl })
  return (
    <>
      <SortFilterBar {...list.bar} searchPlaceholder="Search people" />
      <ol aria-label="People">
        {list.rows.map((r) => (
          <li key={r.name}>{r.name}</li>
        ))}
      </ol>
      <button type="button" onClick={list.clear}>
        Clear
      </button>
    </>
  )
}

const names = () => within(screen.getByRole('list', { name: 'People' })).queryAllByRole('listitem').map((li) => li.textContent)

const pick = (filter: string, option: RegExp) => {
  fireEvent.click(screen.getByRole('button', { name: filter }))
  fireEvent.click(screen.getByRole('checkbox', { name: option }))
}

const sortBy = async (current: string, option: string) => {
  fireEvent.click(screen.getByRole('button', { name: current }))
  fireEvent.click(await screen.findByRole('menuitem', { name: option }))
}

describe('useSortFilter', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'))

  it('starts on the first sort', () => {
    render(<Example />)
    expect(names()).toEqual(['Avery', 'Jordan', 'Sam'])
    expect(screen.getByText('3 results')).toBeInTheDocument()
  })

  it('puts rows with no value last, whichever way it sorts', async () => {
    render(<Example />)
    await sortBy('Name', 'Newest')
    expect(names()).toEqual(['Jordan', 'Sam', 'Avery'])
  })

  it('searches what it’s told to, ignoring case', () => {
    render(<Example />)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search people' }), { target: { value: 'NURS' } })
    expect(names()).toEqual(['Avery'])
    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  it('counts each option, and lists the values rows have when none are given', () => {
    render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: 'Major' }))
    expect(screen.getByRole('checkbox', { name: /Biology\s*2/ })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Nursing\s*1/ })).toBeInTheDocument()
  })

  it('widens within a filter and narrows across filters', () => {
    render(<Example />)
    pick('Major', /Biology/)
    expect(names()).toEqual(['Jordan', 'Sam'])
    fireEvent.click(screen.getByRole('checkbox', { name: /Nursing/ }))
    expect(names()).toEqual(['Avery', 'Jordan', 'Sam'])
    fireEvent.click(document.body)
    pick('Tags', /officer/)
    expect(names()).toEqual(['Avery'])
  })

  it('clears filters and search, and leaves the sort', async () => {
    render(<Example />)
    await sortBy('Name', 'Newest')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sam' } })
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(names()).toEqual(['Jordan', 'Sam', 'Avery'])
  })

  it('leaves the address alone unless asked', () => {
    render(<Example />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sam' } })
    expect(window.location.search).toBe('')
  })

  it('reads its choices from the address, and keeps them there', async () => {
    window.history.replaceState(null, '', '/?major=Biology&sort=joined&q=sa')
    render(<Example syncUrl />)
    expect(names()).toEqual(['Sam'])
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    expect(window.location.search).toBe('?major=Biology&sort=joined')
    await sortBy('Newest', 'Name')
    expect(window.location.search).toBe('?major=Biology')
  })

  it('ignores a sort in the address it doesn’t know, and keeps other parameters', () => {
    window.history.replaceState(null, '', '/?sort=nonsense&ref=mail')
    render(<Example syncUrl />)
    expect(names()).toEqual(['Avery', 'Jordan', 'Sam'])
    expect(window.location.search).toContain('ref=mail')
  })
})

describe('PostList', () => {
  const post = (n: number, extra: Partial<PostSummary> = {}): PostSummary => ({
    slug: `post-${n}`,
    title: `Post ${n}`,
    excerpt: null,
    cover_image_url: null,
    published_at: new Date(Date.UTC(2026, 0, 1 + n)).toISOString(),
    category: null,
    featured: false,
    author_name: null,
    ...extra,
  })
  const titles = () => screen.getAllByRole('link').map((l) => l.textContent ?? '')

  beforeEach(() => window.history.replaceState(null, '', '/posts'))

  it('puts pinned posts first in the usual order, and not in one someone picked', async () => {
    render(<PostList posts={[post(1, { featured: true }), post(2), post(3)]} />)
    expect(titles()[0]).toContain('Post 1')
    expect(titles()[0]).toContain('Pinned')
    await sortBy('Newest first', 'Title, A to Z')
    expect(titles().map((t) => t.includes('Post 1'))).toEqual([true, false, false])
    await sortBy('Title, A to Z', 'Oldest first')
    expect(titles()[2]).toContain('Post 3')
  })

  it('shows ten at a time, and goes back to the first page after a search', async () => {
    render(<PostList posts={Array.from({ length: 12 }, (_, i) => post(i + 1))} />)
    expect(titles()).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: /page 2/i }))
    expect(titles()).toHaveLength(2)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Post' } })
    expect(screen.queryByRole('button', { name: /page 2/i })).toBeInTheDocument()
    expect(titles()).toHaveLength(10)
  })

  it('opens on the category in the address', async () => {
    window.history.replaceState(null, '', '/posts?category=recaps')
    await act(async () => {
      render(<PostList posts={[post(1, { category: 'recaps' }), post(2, { category: 'events' })]} />)
    })
    expect(titles()).toHaveLength(1)
    expect(titles()[0]).toContain('Recaps')
  })

  it('offers a way back when nothing matches', () => {
    render(<PostList posts={[post(1)]} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    fireEvent.click(screen.getByRole('button', { name: 'Show all posts' }))
    expect(titles()).toHaveLength(1)
  })
})
