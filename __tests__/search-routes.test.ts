/**
 * @jest-environment node
 */
import type { NextRequest } from 'next/server'

import type { SearchEntry } from '../app/lib/search'

const SITE: SearchEntry[] = [
  { title: 'Parking guide', href: '/guides/parking', kind: 'Page', summary: 'Decks K, M, and T', text: 'Where commuters park.' },
  { title: 'Fall social', href: '/events#event-fall', kind: 'Event', summary: 'Food and games' },
]
const DASHBOARD: SearchEntry[] = [{ title: 'Jordan Lee', href: '/dashboard/members/1', kind: 'Member', meta: 'jordan@student.gsu.edu', keywords: ['jordan@student.gsu.edu'] }]

const getSearchIndex = jest.fn(async () => SITE)
jest.mock('../app/lib/dashboard/public', () => ({ getSearchIndex: () => getSearchIndex() }))
jest.mock('../app/lib/dashboard/searchIndex', () => ({ getDashboardSearchIndex: jest.fn(async () => DASHBOARD) }))

const ask = (url: string) => ({ nextUrl: new URL(url, 'https://cseg.test') }) as unknown as NextRequest

describe('The site’s search endpoint', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GET } = require('../app/api/search/route') as typeof import('../app/api/search/route')

  it('counts every match by kind, and narrows to one kind when asked', async () => {
    const all = await (await GET(ask('/api/search?q=social'))).json()
    expect(all).toMatchObject({ total: 1, kinds: { Event: 1 } })
    const pages = await (await GET(ask('/api/search?q=social&kind=Page'))).json()
    expect(pages).toMatchObject({ results: [], total: 0, kinds: { Event: 1 } })
  })

  it('suggests what’s on before anything’s typed: the next events', async () => {
    const body = await (await GET(ask('/api/search'))).json()
    expect(body.suggested.map((r: { title: string }) => r.title)).toEqual(['Fall social'])
  })

  it('answers with the best matches, without the words they were found by', async () => {
    const response = await GET(ask('/api/search?q=park'))
    const body = await response.json()
    expect(body.query).toBe('park')
    expect(body.results).toEqual([expect.objectContaining({ title: 'Parking guide', href: '/guides/parking', kind: 'Page' })])
    expect(body.results[0]).not.toHaveProperty('text')
    expect(response.headers.get('cache-control')).toContain('public')
  })

  it('answers nothing for nothing, and builds the index once for many searches', async () => {
    expect(await (await GET(ask('/api/search?q=%20%20'))).json()).toMatchObject({ query: '', results: [], total: 0 })
    await GET(ask('/api/search?q=fall'))
    await GET(ask('/api/search?q=social'))
    expect(getSearchIndex).toHaveBeenCalledTimes(1)
  })
})

describe('The dashboard’s search endpoint', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GET } = require('../app/(dashboard)/dashboard/search/route') as typeof import('../app/(dashboard)/dashboard/search/route')

  it('finds a member by email, and isn’t kept anywhere', async () => {
    const response = await GET(ask('/dashboard/search?q=jordan%40student'))
    expect((await response.json()).results.map((r: { title: string }) => r.title)).toEqual(['Jordan Lee'])
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})
