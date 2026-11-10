import { checkLinks, duplicateDocument, savePage, savePost } from '../app/lib/dashboard/actions'

const form = (fields: Record<string, string>) => {
  const data = new FormData()
  for (const [k, v] of Object.entries({ title: 'Hello', slug: 'hello', ...fields })) data.set(k, v)
  return data
}

// What Supabase holds and answers, set by each test
let existing: Record<string, unknown> | null
let takenSlugs: string[]
const written: { table: string; op: 'insert' | 'update'; values: Record<string, unknown> }[] = []

const query = (table: string) => {
  const chain = {
    select: (_columns?: string, options?: { head?: boolean }) => {
      if (options?.head) return { eq: async (_key: string, slug: string) => ({ count: takenSlugs.includes(slug) ? 1 : 0, error: null }) }
      return chain
    },
    eq: () => chain,
    single: async () => ({ data: { id: 'new-id' }, error: null }),
    maybeSingle: async () => ({ data: existing, error: null }),
    insert: (values: Record<string, unknown>) => {
      written.push({ table, op: 'insert', values })
      return chain
    },
    update: (values: Record<string, unknown>) => {
      written.push({ table, op: 'update', values })
      return chain
    },
  }
  return chain
}
const supabase = { from: (table: string) => (table === 'activity' ? { insert: async () => ({ error: null }) } : query(table)) }

jest.mock('../app/lib/dashboard/dal', () => ({
  requireAdmin: jest.fn(),
  requireOfficer: jest.fn(async () => ({ supabase, officer: { email: 'pres@gsu.edu', name: 'Jordan Lee', role: 'admin' } })),
}))
jest.mock('../app/lib/dashboard/queries', () => ({ listEvents: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))

const DAY = 86_400_000
const future = new Date(Date.now() + 3 * DAY).toISOString()
const past = new Date(Date.now() - 3 * DAY).toISOString()
const saved = () => written.find((w) => w.table !== 'activity')!.values

beforeEach(() => {
  jest.clearAllMocks()
  written.length = 0
  existing = null
  takenSlugs = []
})

describe('Saving a post', () => {
  it('signs a new post with the officer’s name, and leaves an edit’s author alone', async () => {
    await savePost(null, form({ status: 'draft' }))
    expect(saved().author_name).toBe('Jordan Lee')
    written.length = 0
    await savePost('p1', form({ status: 'draft' }))
    expect(saved()).not.toHaveProperty('author_name')
  })

  it('dates a scheduled post by when it goes up, and says so', async () => {
    const result = await savePost(null, form({ status: 'published', publish_at: future }))
    expect(saved().published_at).toBe(future)
    expect(result).toMatchObject({ ok: true, message: expect.stringContaining('Scheduled for') })
  })

  it('moves the date with the schedule until the post has gone up', async () => {
    existing = { published_at: future }
    const later = new Date(Date.now() + 9 * DAY).toISOString()
    await savePost('p1', form({ status: 'published', publish_at: later }))
    expect(saved().published_at).toBe(later)
  })

  it('keeps the first date of a post that’s been up', async () => {
    existing = { published_at: past }
    await savePost('p1', form({ status: 'published' }))
    expect(saved().published_at).toBe(past)
  })

  it('saves category and pinning', async () => {
    await savePost(null, form({ status: 'draft', category: 'recaps', featured: 'on' }))
    expect(saved()).toMatchObject({ category: 'recaps', featured: true })
  })
})

describe('Review', () => {
  it('keeps a draft’s request and its note', async () => {
    await savePost('p1', form({ status: 'draft', review_requested: 'on', review_note: 'Check the date' }))
    expect(saved()).toMatchObject({ review_requested: true, review_note: 'Check the date' })
  })

  it('drops the note when the request is turned off', async () => {
    await savePage('g1', form({ status: 'draft', review_note: 'Stale' }))
    expect(saved()).toMatchObject({ review_requested: false, review_note: null })
  })

  it('is settled by publishing', async () => {
    await savePost('p1', form({ status: 'published', review_requested: 'on', review_note: 'Check the date' }))
    expect(saved()).toMatchObject({ review_requested: false, review_note: null })
  })
})

describe('Duplicating', () => {
  const post = { slug: 'hello', title: 'Hello', excerpt: 'Hi', body: 'Words', cover_image_url: 'https://x.test/a.png', category: 'events', featured: true, status: 'published', publish_at: future, published_at: past, review_requested: true }

  it('makes a draft of the writing, without its schedule or pin', async () => {
    existing = post
    const result = await duplicateDocument('post', 'p1')
    expect(result).toEqual({ ok: true, id: 'new-id', message: 'Copied to a new draft' })
    expect(saved()).toEqual({ excerpt: 'Hi', body: 'Words', cover_image_url: 'https://x.test/a.png', category: 'events', author_name: 'Jordan Lee', slug: 'hello-copy', title: 'Copy of Hello', status: 'draft' })
  })

  it('finds the next free address', async () => {
    existing = post
    takenSlugs = ['hello-copy', 'hello-copy-2']
    await duplicateDocument('post', 'p1')
    expect(saved().slug).toBe('hello-copy-3')
  })

  it('copies a page’s layout and sections', async () => {
    existing = { slug: 'guide', title: 'Guide', description: null, subtitle: null, layout: 'sections', sections: [{ id: 's1' }], body: '', eyebrow: null, share_image_url: null, show_toc: true, show_updated: false, publish_at: future }
    await duplicateDocument('page', 'g1')
    expect(saved()).toMatchObject({ layout: 'sections', sections: [{ id: 's1' }], show_toc: true, status: 'draft' })
    expect(saved()).not.toHaveProperty('publish_at')
  })

  it('says when the original is gone', async () => {
    expect(await duplicateDocument('post', 'p1')).toEqual({ ok: false, error: 'That post is gone.' })
  })
})

describe('Checking links', () => {
  const realFetch = global.fetch
  const answers: Record<string, number | Error> = {}
  const fetched = jest.fn()

  beforeEach(() => {
    fetched.mockClear()
    global.fetch = jest.fn(async (url: string, init: RequestInit) => {
      fetched(url, init)
      const answer = answers[url]
      if (answer instanceof Error) throw answer
      return { status: answer ?? 200 }
    }) as unknown as typeof fetch
  })
  afterAll(() => {
    global.fetch = realFetch
  })

  it('reports what’s clearly gone, and nothing else', async () => {
    const timeout = new Error('Timed out')
    timeout.name = 'TimeoutError'
    Object.assign(answers, {
      'https://gone.test/': 404,
      'https://removed.test/': 410,
      'https://blocks-robots.test/': 403,
      'https://down.test/': 503,
      'https://slow.test/': timeout,
      'https://no-such-site.test/': new TypeError('fetch failed'),
    })
    expect(await checkLinks(['https://gone.test/', 'https://removed.test/', 'https://blocks-robots.test/', 'https://down.test/', 'https://slow.test/', 'https://no-such-site.test/', 'https://fine.test/'])).toEqual([
      'https://gone.test/',
      'https://removed.test/',
      'https://no-such-site.test/',
    ])
  })

  it('never reaches for a private address, or follows a redirect', async () => {
    await checkLinks(['http://169.254.169.254/latest/meta-data', 'http://localhost:3000/', 'https://fine.test/'])
    expect(fetched).toHaveBeenCalledTimes(1)
    expect(fetched.mock.calls[0][0]).toBe('https://fine.test/')
    expect(fetched.mock.calls[0][1]).toMatchObject({ method: 'HEAD', redirect: 'manual' })
  })

  it('checks each link once, and only so many', async () => {
    const many = Array.from({ length: 40 }, (_, i) => `https://site${i}.test/`)
    await checkLinks([...many, ...many])
    expect(fetched).toHaveBeenCalledTimes(25)
  })
})
