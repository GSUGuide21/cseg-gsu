import { connectionFromRow, connectionToRow, pathText } from '@/lib/connections'
import { engagement, needsAttention } from '@/lib/dashboard/overview'
import { instagramHandleFrom, parseAffiliate, parseConnection, parseContactMessage, parsePath } from '@/lib/dashboard/validate'
import { CONNECTIONS } from '@/lib/data/connections'
import type { MapConnectionRow } from '@/lib/supabase/types'

const form = (fields: Record<string, string | string[]>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) for (const value of [v].flat()) f.append(k, value)
  return f
}

describe('affiliates, as typed', () => {
  it('makes its address from its short name, takes an Instagram link or handle, and the end of a PIN link', () => {
    const parsed = parseAffiliate(
      form({
        name: 'Chess Club at Georgia State',
        short_name: 'Chess Club',
        wordmark_top: 'Chess',
        instagram: 'https://www.instagram.com/gsuchess/',
        pin_key: 'https://pin.gsu.edu/organization/chess-club',
        published: 'on',
      }),
      null
    )
    expect(parsed).toMatchObject({ ok: true, data: { slug: 'chess-club', instagram: 'gsuchess', pin_key: 'chess-club', published: true } })
  })

  it('keeps its address after a rename', () => {
    const parsed = parseAffiliate(form({ name: 'Renamed', wordmark_top: 'R', instagram: '@renamed' }), 'chess-club')
    expect(parsed).toMatchObject({ ok: true, data: { slug: 'chess-club', short_name: 'Renamed', instagram: 'renamed' } })
  })

  it('says what’s missing or wrong, field by field', () => {
    const parsed = parseAffiliate(form({ name: '', instagram: 'not a handle!', logo_url: 'ftp://x', discord_url: 'discord.gg/x' }), null)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(Object.keys(parsed.errors).sort()).toEqual(['discord_url', 'instagram', 'logo_url', 'name', 'short_name', 'wordmark_top'])
  })

  it('reads handles however they’re pasted', () => {
    expect(instagramHandleFrom('@dream_gsu')).toBe('dream_gsu')
    expect(instagramHandleFrom('https://instagram.com/dream_gsu?igsh=abc')).toBe('dream_gsu')
  })
})

describe('skybridges and shortcuts, as typed', () => {
  it('reads a path a point a line, with or without brackets, near campus only', () => {
    expect(parsePath('33.75252, -84.38667\n[33.75236, -84.38677],\n')).toEqual([
      [33.75252, -84.38667],
      [33.75236, -84.38677],
    ])
    expect(parsePath('40.7, -74.0')).toBeNull()
    expect(parsePath('somewhere')).toBeNull()
  })

  it('takes two buildings for its ends, or none', () => {
    const base = { name: 'The Link', kind: 'indoor', path: '33.75252, -84.38667\n33.75236, -84.38677' }
    expect(parseConnection(form({ ...base, ends: ['library-north', 'library-south'] }), null)).toMatchObject({ ok: true, data: { slug: 'the-link', ends: ['library-north', 'library-south'] } })
    expect(parseConnection(form(base), null)).toMatchObject({ ok: true, data: { ends: [] } })
    expect(parseConnection(form({ ...base, ends: ['library-north'] }), null)).toMatchObject({ ok: false, errors: { ends: expect.any(String) } })
    expect(parseConnection(form({ ...base, ends: ['library-north', 'nowhere'] }), null)).toMatchObject({ ok: false, errors: { ends: expect.any(String) } })
  })

  it('needs a kind and two points, and keeps tuning numbers in range', () => {
    const parsed = parseConnection(form({ name: 'X', kind: 'tunnel', path: '33.75252, -84.38667', favor: '5', penalty: '-1' }), null)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(Object.keys(parsed.errors).sort()).toEqual(['favor', 'kind', 'path', 'penalty'])
  })

  it('accepts every built-in one as the dashboard would save it, and reads it back the same', () => {
    for (const [i, c] of CONNECTIONS.entries()) {
      const { sort, ...row } = connectionToRow(c, i)
      const parsed = parseConnection(
        form({
          name: c.name,
          kind: c.kind,
          note: c.note,
          path: pathText(c.path),
          ends: [...(c.ends ?? [])],
          ...(c.inOsm ? { in_osm: 'on' } : {}),
          ...(c.halfWidth ? { half_width: String(c.halfWidth) } : {}),
          ...(c.favor ? { favor: String(c.favor) } : {}),
          ...(c.penalty ? { penalty: String(c.penalty) } : {}),
          ...(c.stairs ? { stairs: 'on' } : {}),
          published: 'on',
        }),
        c.id
      )
      expect(parsed).toMatchObject({ ok: true, data: row })
      expect(connectionFromRow({ ...row, sort, id: 'x', created_at: '', updated_at: '' } as MapConnectionRow)).toEqual(c)
    }
  })
})

describe('messages from the Contact page', () => {
  it('takes a name, an email to reply to, and the message', () => {
    expect(parseContactMessage(form({ name: ' Jordan ', email: 'JLee@Student.gsu.edu', subject: '', body: 'Hi!', website: '' }))).toMatchObject({
      ok: true,
      bot: false,
      data: { name: 'Jordan', email: 'jlee@student.gsu.edu', subject: null, body: 'Hi!' },
    })
    expect(parseContactMessage(form({ name: '', email: 'nope', body: '' }))).toMatchObject({ ok: false, errors: { name: expect.any(String), email: expect.any(String), body: expect.any(String) } })
  })

  it('marks one whose hidden field is filled in as a bot’s', () => {
    expect(parseContactMessage(form({ name: 'A', email: 'a@b.co', body: 'Buy now', website: 'https://spam.example' })).bot).toBe(true)
  })
})

describe('the Overview', () => {
  const now = Date.parse('2026-11-10T15:00:00Z')
  const doc = (id: string, title: string, over: Partial<{ status: string; updated_at: string; review_requested: boolean }> = {}) => ({
    id,
    title,
    status: 'draft',
    updated_at: '2026-11-09T00:00:00Z',
    review_requested: false,
    ...over,
  })

  it('lists what needs attention, and nothing when all’s well', () => {
    const items = needsAttention({
      unread: 2,
      posts: [doc('p1', 'Fall recap', { review_requested: true }), doc('p2', 'Old idea', { updated_at: '2026-09-01T00:00:00Z' }), doc('p3', 'Live', { status: 'published', updated_at: '2025-01-01T00:00:00Z' })],
      pages: [],
      eateries: [
        { id: 'e1', name: 'Panther Grill', checked_on: '2026-11-01' },
        { id: 'e2', name: 'Piedmont', checked_on: '2026-06-01' },
        { id: 'e3', name: 'New spot', checked_on: null },
      ],
      closures: [
        { id: 'c1', label: 'Veterans Day week', starts_on: '2026-11-20', ends_on: '2026-11-22' },
        { id: 'c2', label: 'Winter break', starts_on: '2026-12-15', ends_on: '2027-01-05' },
      ],
      now,
      today: '2026-11-10',
    })
    expect(items.map((i) => i.title)).toEqual(['2 unread messages', '1 draft waiting for review', '1 draft untouched for 30+ days', '2 eateries with hours to check', '1 closure starting soon'])
    expect(items[1]).toMatchObject({ detail: 'Fall recap', href: '/dashboard/posts/p1' })
    expect(items[3].detail).toContain('Piedmont, New spot')
    expect(items[4].detail).toBe('Veterans Day week (in 10 days)')

    expect(needsAttention({ unread: 0, posts: [], pages: [], eateries: [], closures: [], now, today: '2026-11-10' })).toEqual([])
  })

  it('counts members who come back, who has drifted off, and the busiest events', () => {
    const members = [
      { id: 'm1', name: 'Ada', status: 'active', joined_on: '2025-01-01' },
      { id: 'm2', name: 'Ben', status: 'active', joined_on: '2025-01-01' },
      { id: 'm3', name: 'Cy', status: 'active', joined_on: '2026-11-01' },
      { id: 'm4', name: 'Di', status: 'inactive', joined_on: '2025-01-01' },
    ]
    const checkins = [
      { member_id: 'm1', event_id: 'e1', event_name: 'Welcome', checked_in_at: '2026-10-01T18:00:00Z' },
      { member_id: 'm1', event_id: 'e2', event_name: 'Study night', checked_in_at: '2026-10-20T18:00:00Z' },
      { member_id: 'm2', event_id: 'e1', event_name: 'Welcome', checked_in_at: '2026-01-10T18:00:00Z' },
      { member_id: null, event_id: 'e1', event_name: 'Welcome', checked_in_at: '2026-10-01T18:05:00Z' },
    ]
    const e = engagement({ members, checkins, now })
    expect(e).toMatchObject({ attendees: 2, returning: 1 })
    // Ben was last seen in January; Cy only just joined; Di isn't active
    expect(e.lapsed).toEqual([{ id: 'm2', name: 'Ben', lastSeen: '2026-01-10T18:00:00Z' }])
    // Ben's January check-in is older than six months
    expect(e.topEvents).toEqual([
      { id: 'e1', name: 'Welcome', count: 2 },
      { id: 'e2', name: 'Study night', count: 1 },
    ])
  })
})
