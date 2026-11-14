import { clearDraft, readDraft, writeDraft } from '../app/lib/dashboard/draftStore'
import { documentAssets, documentChecks } from '../app/lib/dashboard/documentChecks'
import { isPublicUrl, parseDocument } from '../app/lib/dashboard/validate'
import { rssFeed } from '../app/lib/feed'
import { documentHeadings, readingMinutes } from '../app/lib/richtext'
import { searchContent } from '../app/lib/search'

const rich = (...children: unknown[]) => JSON.stringify({ root: { type: 'root', children } })
const heading = (tag: string, text: string) => ({ type: 'heading', tag, children: [{ type: 'text', text }] })
const paragraph = (...children: unknown[]) => ({ type: 'paragraph', children })

describe('RSS feed', () => {
  const post = { slug: 'fall', title: 'Tom & Jerry <3', excerpt: 'Food "and" fun', published_at: '2026-10-01T12:00:00Z', author_name: 'Priya', category: 'events' }

  it('lists each post with its link, date, and author', () => {
    const feed = rssFeed([post])
    expect(feed).toContain('<link>http://localhost:3000/posts/fall</link>')
    expect(feed).toContain('<pubDate>Thu, 01 Oct 2026 12:00:00 GMT</pubDate>')
    expect(feed).toContain('<dc:creator>Priya</dc:creator>')
  })

  it('escapes what would break the XML', () => {
    const feed = rssFeed([{ ...post, title: 'Tom & Jerry <3\u0007' }])
    expect(feed).toContain('<title>Tom &amp; Jerry &lt;3</title>')
    expect(feed).toContain('Food &quot;and&quot; fun')
  })

  it('leaves out what a post doesn’t have', () => {
    const feed = rssFeed([{ ...post, excerpt: null, author_name: null, category: null, published_at: null }])
    expect(feed).not.toMatch(/<description>Food|dc:creator>|<pubDate>|<category>/)
  })
})

describe('Site search', () => {
  const entries = [
    { title: 'Parking on campus', href: '/a', kind: 'Page', text: 'Where to leave your car overnight.' },
    { title: 'Student resources', href: '/b', kind: 'Page', summary: 'Help with parking permits.' },
    { title: 'Late night food', href: '/c', kind: 'Post', text: `${'Words here. '.repeat(30)}The parking deck is near the dining hall. ${'More words. '.repeat(30)}` },
  ]

  it('finds nothing for nothing', () => {
    expect(searchContent(entries, '   ')).toEqual([])
  })

  it('ranks a title above a summary above the text', () => {
    expect(searchContent(entries, 'parking').map((r) => r.href)).toEqual(['/a', '/b', '/c'])
  })

  it('needs every word, in any order and case', () => {
    expect(searchContent(entries, 'CAR parking').map((r) => r.href)).toEqual(['/a'])
    expect(searchContent(entries, 'parking unicorn')).toEqual([])
  })

  it('shows the words around a match deep in the text', () => {
    const [result] = searchContent(entries, 'dining')
    expect(result.snippet).toContain('dining hall')
    expect(result.snippet.startsWith('…')).toBe(true)
    expect(result.snippet.endsWith('…')).toBe(true)
  })

  it('prefers the summary as the snippet when it matches', () => {
    expect(searchContent(entries, 'permits')[0].snippet).toBe('Help with parking permits.')
  })

  it('stops at the limit', () => {
    expect(searchContent(entries, 'parking', 2)).toHaveLength(2)
  })
})

describe('Post reading', () => {
  it('rounds reading time, and never says zero', () => {
    expect(readingMinutes('')).toBe(1)
    expect(readingMinutes(Array(660).fill('word').join(' '))).toBe(3)
  })

  it('lists main headings with their links, a second with the same words linking to its own place', () => {
    const body = rich(heading('h2', 'Getting there'), heading('h3', 'By train'), heading('h2', 'What to bring'), heading('h2', 'Getting there'))
    expect(documentHeadings(body)).toEqual([
      { id: 'getting-there', text: 'Getting there' },
      { id: 'what-to-bring', text: 'What to bring' },
      { id: 'getting-there-2', text: 'Getting there' },
    ])
  })

  it('has no headings to list from older markdown', () => {
    expect(documentHeadings('## A heading')).toEqual([])
  })
})

describe('Writing checks', () => {
  const base: { kind: 'post' | 'page'; title: string; summary: string; cover: string; category?: string; words: number; bodies: string[] } = { kind: 'post', title: 'Hello', summary: 'A summary', cover: 'https://x.test/a.png', category: 'events', words: 40, bodies: [rich(paragraph())] }
  const ids = (input: Partial<typeof base>) => documentChecks({ ...base, ...input }).map((c) => c.id)

  it('has nothing to say about a finished post', () => {
    expect(ids({})).toEqual([])
  })

  it('finds images and links, however deep, once each', () => {
    const link = { type: 'link', url: 'https://x.test', children: [] }
    const { images, links } = documentAssets([rich(paragraph(link, { type: 'autolink', url: 'https://x.test' })), rich({ type: 'image', src: 'a.png', alt: '' })])
    expect(links).toEqual(['https://x.test'])
    expect(images).toEqual([{ src: 'a.png', alt: '' }])
  })

  it('flags images with no description, and insecure links, as worth fixing', () => {
    const bodies = [rich({ type: 'image', src: 'a.png', alt: ' ' }, { type: 'image', src: 'b.png', alt: 'Officers' }, paragraph({ type: 'link', url: 'http://x.test', children: [] }))]
    const checks = documentChecks({ ...base, bodies })
    expect(checks.map((c) => [c.id, c.tone])).toEqual([
      ['alt', 'warning'],
      ['http', 'warning'],
    ])
    expect(checks[0].message).toContain('1 image has')
  })

  it('only asks posts for a cover and a category', () => {
    expect(ids({ cover: '', category: undefined })).toEqual(['cover', 'category'])
    expect(ids({ kind: 'page', cover: '', category: undefined })).toEqual([])
  })

  it('points out what’s missing', () => {
    expect(ids({ words: 0, summary: ' ' })).toEqual(['empty', 'summary'])
  })
})

describe('Link checks stay on the public internet', () => {
  it.each(['https://www.gsu.edu/page', 'http://example.org', 'https://8.8.8.8/'])('allows %s', (url) => {
    expect(isPublicUrl(url)).toBe(true)
  })

  it.each([
    'http://localhost:3000',
    'http://127.0.0.1/',
    'http://10.0.0.5/',
    'http://172.16.0.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data',
    'http://0.0.0.0/',
    'http://[::1]/',
    'http://intranet/',
    'http://printer.local/',
    'file:///etc/passwd',
    'ftp://example.org',
    '/posts/hello',
    'not a url',
  ])('refuses %s', (url) => {
    expect(isPublicUrl(url)).toBe(false)
  })
})

describe('Saving a document', () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData()
    for (const [k, v] of Object.entries({ title: 'Hello', ...fields })) data.set(k, v)
    return data
  }

  it('keeps a category from the list', () => {
    const parsed = parseDocument(form({ category: 'recaps', featured: 'on', review_requested: 'on', review_note: ' Check dates ' }))
    expect(parsed.ok && parsed.data).toMatchObject({ category: 'recaps', featured: true, review_requested: true, review_note: 'Check dates' })
  })

  it('turns away a category that isn’t', () => {
    const parsed = parseDocument(form({ category: 'gossip' }))
    expect(!parsed.ok && parsed.errors.category).toBe('Pick one of the categories.')
  })
})

describe('Drafts kept in the browser', () => {
  beforeEach(() => window.localStorage.clear())

  it('keeps each document’s apart', () => {
    writeDraft('post', 'a', 'first')
    writeDraft('page', 'a', 'second')
    writeDraft('post', null, 'third')
    expect(readDraft('post', 'a')?.snapshot).toBe('first')
    expect(readDraft('page', 'a')?.snapshot).toBe('second')
    expect(readDraft('post', null)?.snapshot).toBe('third')
    clearDraft('post', 'a')
    expect(readDraft('post', 'a')).toBeNull()
    expect(readDraft('page', 'a')).not.toBeNull()
  })

  it('shrugs off storage that’s been tampered with', () => {
    window.localStorage.setItem('cseg:draft:post:a', 'not json')
    expect(readDraft('post', 'a')).toBeNull()
    window.localStorage.setItem('cseg:draft:post:a', '{"savedAt":"soon"}')
    expect(readDraft('post', 'a')).toBeNull()
  })

  it('doesn’t stop anyone writing when storage is off', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded')
    })
    expect(() => writeDraft('post', 'a', 'x')).not.toThrow()
    setItem.mockRestore()
  })
})
