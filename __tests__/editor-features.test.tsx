import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { NotificationProvider } from '@/components'
import type { PostRow } from '@/lib/supabase/types'

import { DocumentEditor } from '../app/(dashboard)/dashboard/DocumentEditor'
import { DocumentList, type DocumentSummary } from '../app/(dashboard)/dashboard/DocumentList'
import { readDraft, writeDraft } from '../app/lib/dashboard/draftStore'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn(), replace: jest.fn(), push }), usePathname: () => '/dashboard/posts' }))
jest.mock('../app/lib/dashboard/actions', () => ({
  savePost: jest.fn(async () => ({ ok: true, id: 'p1', message: 'Draft saved' })),
  savePage: jest.fn(),
  deletePost: jest.fn(),
  deletePage: jest.fn(),
  checkSlug: jest.fn(async () => ({ ok: true })),
  duplicateDocument: jest.fn(async () => ({ ok: true, id: 'copy-id', message: 'Copied to a new draft' })),
  checkLinks: jest.fn(async () => ['https://gone.test/']),
  listRevisions: jest.fn(async () => []),
  getRevision: jest.fn(async () => null),
  restoreRevision: jest.fn(),
}))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const actions = require('../app/lib/dashboard/actions') as Record<string, jest.Mock>

jest.setTimeout(20_000)

const stamp = '2026-10-20T15:00:00Z'
const body = (...children: unknown[]) => JSON.stringify({ root: { type: 'root', version: 1, format: '', indent: 0, direction: null, children: [{ type: 'paragraph', version: 1, format: '', indent: 0, direction: null, children }] } })
const words = (text: string) => ({ type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' })
const POST: PostRow = {
  id: 'p1', slug: 'hello', title: 'Hello', excerpt: 'Hi', body: body(words('Saved words')), cover_image_url: 'https://x.test/a.png', status: 'draft', published_at: null, publish_at: null, unpublish_at: null,
  category: 'events', featured: false, author_email: null, author_name: null, review_requested: false, review_note: null, created_at: stamp, updated_at: stamp,
}

const open = async (doc: PostRow | null = POST) => {
  const view = render(
    <NotificationProvider>
      <DocumentEditor kind="post" doc={doc} />
    </NotificationProvider>
  )
  await act(async () => {})
  return view
}

/** What the editor keeps, from a real session: open it, change the title, let the autosave run */
const leaveUnsavedWork = async (title: string) => {
  jest.useFakeTimers()
  const { unmount } = await open()
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: title } })
  act(() => {
    jest.advanceTimersByTime(1500)
  })
  jest.useRealTimers()
  unmount()
}

describe('Autosave', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
  })

  it('keeps unsaved work a moment after it changes', async () => {
    await leaveUnsavedWork('Changed title')
    expect(JSON.parse(readDraft('post', 'p1')!.snapshot).title).toBe('Changed title')
  })

  it('offers it back next time, and restores it', async () => {
    await leaveUnsavedWork('Changed title')
    await open()
    expect(screen.getByText('You have unsaved work here')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Hello')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Restore it' })))
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Changed title')
    expect(screen.queryByText('You have unsaved work here')).not.toBeInTheDocument()
  })

  it('forgets it when discarded', async () => {
    await leaveUnsavedWork('Changed title')
    await open()
    fireEvent.click(screen.getByRole('button', { name: 'Discard it' }))
    expect(readDraft('post', 'p1')).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Hello')
  })

  it('doesn’t write over an older copy until someone answers', async () => {
    await leaveUnsavedWork('Older work')
    jest.useFakeTimers()
    await open()
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'New typing' } })
    act(() => {
      jest.advanceTimersByTime(1500)
    })
    jest.useRealTimers()
    expect(JSON.parse(readDraft('post', 'p1')!.snapshot).title).toBe('Older work')
  })

  it('warns when the post was saved again since', async () => {
    writeDraft('post', 'p1', JSON.stringify({ title: 'Old' }))
    const stored = JSON.parse(window.localStorage.getItem('cseg:draft:post:p1')!)
    window.localStorage.setItem('cseg:draft:post:p1', JSON.stringify({ ...stored, savedAt: Date.parse(stamp) - 60_000 }))
    await open()
    expect(screen.getByText(/saved again since then/)).toBeInTheDocument()
  })

  it('stops keeping it once it’s really saved', async () => {
    await leaveUnsavedWork('Changed title')
    await open()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Restore it' })))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save draft' })))
    expect(readDraft('post', 'p1')).toBeNull()
  })

  it('ignores a copy that matches what’s saved', async () => {
    await open()
    expect(screen.queryByText('You have unsaved work here')).not.toBeInTheDocument()
  })
})

describe('The editor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
  })

  it('sends the schedule, category, pin, and review with a post', async () => {
    await open()
    fireEvent.click(screen.getByRole('switch', { name: /Pin this post/ }))
    fireEvent.click(screen.getByRole('switch', { name: /Ready for review/ }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Note for the reviewer' }), { target: { value: 'Check the date' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save draft' })))
    const sent = (actions.savePost.mock.calls[0] as unknown[])[1] as FormData
    expect(sent.get('category')).toBe('events')
    expect(sent.get('featured')).toBe('on')
    expect(sent.get('review_requested')).toBe('on')
    expect(sent.get('review_note')).toBe('Check the date')
    expect(sent.has('publish_at')).toBe(true)
  })

  it('offers to schedule a post, as it does a page', async () => {
    await open()
    expect(screen.getByText('Goes live')).toBeInTheDocument()
    expect(screen.getByText('Comes down')).toBeInTheDocument()
  })

  it('points out what’s missing, and checks links on request', async () => {
    const linked = body({ type: 'link', version: 1, url: 'https://gone.test/', format: '', indent: 0, direction: null, rel: null, target: null, title: null, children: [words('A link')] })
    await open({ ...POST, body: linked, excerpt: null, category: null })
    expect(screen.getByText(/No summary/)).toBeInTheDocument()
    expect(screen.getByText(/No category/)).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Check the link' })))
    expect(actions.checkLinks).toHaveBeenCalledWith(['https://gone.test/'])
    expect(screen.getByText('https://gone.test/')).toBeInTheDocument()
  })

  it('duplicates, and opens the copy', async () => {
    await open()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Duplicate' })))
    expect(actions.duplicateDocument).toHaveBeenCalledWith('post', 'p1')
    expect(push).toHaveBeenCalledWith('/dashboard/posts/copy-id')
  })
})

describe('The list of posts', () => {
  const doc = (title: string, extra: Partial<DocumentSummary> = {}): DocumentSummary => ({ id: title, slug: title.toLowerCase(), title, status: 'draft', updated_at: stamp, ...extra })
  const DOCS = [
    doc('Plain'),
    doc('Waiting', { review_requested: true, review_note: 'Check the date' }),
    doc('Soon', { status: 'published', publish_at: new Date(Date.now() + 86_400_000).toISOString() }),
    doc('Over', { status: 'published', unpublish_at: '2020-01-01T00:00:00Z' }),
    doc('Up', { status: 'published', by: 'priya@gsu.edu', category: 'recaps', featured: true }),
  ]
  const show = () =>
    render(
      <NotificationProvider>
        <DocumentList kind="post" docs={DOCS} />
      </NotificationProvider>
    )

  beforeEach(() => window.history.replaceState(null, '', '/dashboard/posts'))

  it('tells each document’s state apart', () => {
    show()
    expect(screen.getByText('Needs review')).toBeInTheDocument()
    expect(screen.getByText(/^Scheduled for/)).toBeInTheDocument()
    expect(screen.getByText('Ended')).toBeInTheDocument()
    expect(screen.getByLabelText('Pinned')).toBeInTheDocument()
  })

  it('filters by that state', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Status' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Needs review/ }))
    expect(screen.getByText('1 result')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Waiting' })).toBeInTheDocument()
  })

  it('filters by who wrote it, and category', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Who' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /priya/ }))
    expect(screen.getByText('1 result')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Category' })).toBeInTheDocument()
  })

  it('can clear a search that finds nothing', () => {
    show()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search posts' }), { target: { value: 'zzz' } })
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByText('5 results')).toBeInTheDocument()
  })

  it('sorts what’s next to go live to the top', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Recently updated' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Next to go live' }))
    expect(screen.getAllByRole('rowheader', {}).at(0) ?? screen.getAllByRole('row')[1]).toHaveTextContent('Soon')
  })
})
