import { approveJoinRequest, saveDues, saveTerm, sendContactMessage, sendJoinRequest, sendRsvp } from '../app/lib/dashboard/actions'

const form = (fields: Record<string, string | string[]>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) for (const value of [v].flat()) f.append(k, value)
  return f
}

type Answer = { data?: unknown; error?: { code?: string; message: string } | null }

// What Supabase answers with, by table and what was asked of it ("members.insert"); and what was asked
let answers: Record<string, Answer>
let writes: { table: string; op: string; values: unknown }[]

/** A stand-in for the Supabase client: every call chains, and awaiting it gives that table's answer */
const from = (table: string) => {
  let op = 'select'
  const chain: Record<string, unknown> = {
    then: (resolve: (answer: Answer) => unknown) => resolve({ data: null, error: null, ...answers[`${table}.${op}`] }),
  }
  for (const method of ['select', 'eq', 'in', 'order', 'limit', 'maybeSingle', 'single']) chain[method] = () => chain
  for (const write of ['insert', 'update', 'delete']) {
    chain[write] = (values: unknown) => {
      op = write
      writes.push({ table, op, values })
      return chain
    }
  }
  return chain
}
const supabase = { from }
const officer = { email: 'pres@gsu.edu', role: 'admin' }

jest.mock('../app/lib/dashboard/dal', () => ({
  requireAdmin: jest.fn(async () => ({ supabase, officer })),
  requireOfficer: jest.fn(async () => ({ supabase, officer })),
  requireStaff: jest.fn(async () => ({ supabase, officer })),
}))
jest.mock('../app/lib/supabase/server', () => ({ createPublicClient: () => supabase }))
jest.mock('../app/lib/dashboard/queries', () => ({ listEvents: jest.fn(async () => ({ upcoming: [], past: [] })) }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))

const MEMBER = '11111111-1111-4111-8111-111111111111'
const TERM = '22222222-2222-4222-8222-222222222222'
const written = (table: string, op: string) => writes.filter((w) => w.table === table && w.op === op).map((w) => w.values)

beforeEach(() => {
  answers = {}
  writes = []
})

describe('requests to join', () => {
  const request = { id: 'r1', name: 'Sam Kim', email: 'sam@student.gsu.edu', major: 'Biology', year: 'Junior', message: null, status: 'pending', member_id: null }

  it('approving one adds them to Members as new, and marks who approved it', async () => {
    answers = { 'join_requests.select': { data: request }, 'members.insert': { data: { id: 'm9' } } }
    const result = await approveJoinRequest('r1')
    expect(result).toEqual({ ok: true, id: 'm9', message: 'Added Sam Kim to Members' })
    expect(written('members', 'insert')).toEqual([{ name: 'Sam Kim', email: 'sam@student.gsu.edu', major: 'Biology', year: 'Junior', status: 'new' }])
    expect(written('join_requests', 'update')[0]).toMatchObject({ status: 'approved', member_id: 'm9', handled_by: 'pres@gsu.edu' })
  })

  it('links to the member who already has that email, rather than adding them twice', async () => {
    answers = { 'join_requests.select': { data: request }, 'members.select': { data: { id: 'm1' } } }
    const result = await approveJoinRequest('r1')
    expect(result).toMatchObject({ ok: true, id: 'm1', message: 'Sam Kim was already a member' })
    expect(written('members', 'insert')).toEqual([])
    expect(written('join_requests', 'update')[0]).toMatchObject({ member_id: 'm1' })
  })

  it('says so when the request has since been deleted', async () => {
    expect(await approveJoinRequest('gone')).toEqual({ ok: false, error: 'That request is gone; it may have been deleted.' })
    expect(writes).toEqual([])
  })

  it('takes one from the site, drops a bot’s without saying so, and says when the club isn’t taking members', async () => {
    expect(await sendJoinRequest(form({ name: 'Sam Kim', email: 'sam@student.gsu.edu' }))).toEqual({ ok: true })
    expect(written('join_requests', 'insert')).toHaveLength(1)

    writes = []
    expect(await sendJoinRequest(form({ name: 'Bot', email: 'bot@x.co', website: 'spam' }))).toEqual({ ok: true })
    expect(writes).toEqual([])

    answers = { 'join_requests.insert': { error: { code: '42501', message: 'new row violates row-level security policy' } } }
    expect(await sendJoinRequest(form({ name: 'Sam Kim', email: 'sam@student.gsu.edu' }))).toEqual({ ok: false, error: 'We aren’t taking new members right now.' })

    answers = { 'join_requests.insert': { error: { code: 'P0001', message: 'We already have your request; an officer will be in touch.' } } }
    expect(await sendJoinRequest(form({ name: 'Sam Kim', email: 'sam@student.gsu.edu' }))).toEqual({ ok: false, error: 'We already have your request; an officer will be in touch.' })
  })
})

describe('RSVPs and messages from the site', () => {
  it('counts an RSVP sent twice as one, without complaint', async () => {
    answers = { 'event_rsvps.insert': { error: { code: '23505', message: 'duplicate key' } } }
    expect(await sendRsvp(form({ event_id: 'game-night', name: 'Sam', email: 'sam@gsu.edu' }))).toEqual({ ok: true })
  })

  it('says when an event is over or called off', async () => {
    answers = { 'event_rsvps.insert': { error: { code: '42501', message: 'new row violates row-level security policy' } } }
    expect(await sendRsvp(form({ event_id: 'game-night', name: 'Sam', email: 'sam@gsu.edu' }))).toEqual({ ok: false, error: 'This event isn’t taking RSVPs anymore.' })
  })

  it('takes no messages once the Contact form is turned off', async () => {
    answers = { 'club_settings.select': { data: { contact_form_open: false } } }
    const result = await sendContactMessage(form({ name: 'Sam', email: 'sam@gsu.edu', body: 'Hello' }))
    expect(result).toEqual({ ok: false, error: 'Messages aren’t being taken from here right now.' })
    expect(writes).toEqual([])
  })
})

describe('terms and dues', () => {
  it('won’t save a term whose days run into another’s', async () => {
    answers = { 'terms.select': { data: [{ id: 't1', name: 'Fall 2026', starts_on: '2026-08-24', ends_on: '2026-12-15' }] } }
    const result = await saveTerm(null, form({ name: 'Winter 2026', dates: ['2026-12-10', '2027-01-05'] }))
    expect(result).toEqual({ ok: false, errors: { dates: 'Those days run into Fall 2026.' } })
    expect(writes).toEqual([])
  })

  it('lets a term’s own dates change', async () => {
    answers = { 'terms.select': { data: [{ id: 't1', name: 'Fall 2026', starts_on: '2026-08-24', ends_on: '2026-12-15' }] }, 'terms.update': { data: { id: 't1' } } }
    const result = await saveTerm('t1', form({ name: 'Fall 2026', dates: ['2026-08-17', '2026-12-15'] }))
    expect(result).toMatchObject({ ok: true, id: 't1' })
    expect(written('terms', 'update')).toEqual([{ name: 'Fall 2026', starts_on: '2026-08-17', ends_on: '2026-12-15' }])
  })

  it('records a payment under whoever took it, and says when that member already paid', async () => {
    answers = { 'members.select': { data: { name: 'Sam Kim' } }, 'dues_payments.insert': { data: { id: 'd1' } } }
    const paid = await saveDues(null, form({ member_id: MEMBER, term_id: TERM, amount: '15', method: 'cash' }))
    expect(paid).toEqual({ ok: true, id: 'd1', message: 'Recorded Sam Kim’s dues' })
    expect(written('dues_payments', 'insert')[0]).toMatchObject({ member_id: MEMBER, term_id: TERM, amount: 15, recorded_by: 'pres@gsu.edu' })

    answers = { 'members.select': { data: { name: 'Sam Kim' } }, 'dues_payments.insert': { error: { code: '23505', message: 'duplicate key' } } }
    const again = await saveDues(null, form({ member_id: MEMBER, term_id: TERM, amount: '15', method: 'cash' }))
    expect(again).toEqual({ ok: false, errors: { member_id: 'Sam Kim has already paid for this term.' } })
  })
})
