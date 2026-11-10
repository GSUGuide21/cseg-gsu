import { checkIn, saveOfficer, updateOfficer } from '../app/lib/dashboard/actions'

const form = (fields: Record<string, string>) => {
  const data = new FormData()
  for (const [k, v] of Object.entries(fields)) data.set(k, v)
  return data
}

// What Supabase answers with, set by each test
let insertResult: { error: { code: string; message: string } | null }
let updateResult: { data: { email: string }[]; error: { code: string; message: string } | null }
const insert = jest.fn(async () => insertResult) as jest.Mock
const update = jest.fn(() => ({ eq: () => ({ select: async () => updateResult }) })) as jest.Mock
const log = jest.fn(async () => ({ error: null })) as jest.Mock
// How guests are handled at the door (Settings); null is before that migration, when guests were always let in
let doorRules: { walkins_allowed: boolean; walkins_become_members: boolean } | null
const select = jest.fn(() => ({ eq: () => ({ maybeSingle: async () => ({ data: doorRules }) }) })) as jest.Mock
const supabase = { from: (table: string) => (table === 'activity' ? { insert: log } : { insert, update, select }) }

jest.mock('../app/lib/dashboard/dal', () => ({
  requireAdmin: jest.fn(async () => ({ supabase, officer: { email: 'pres@gsu.edu', role: 'admin' } })),
  requireOfficer: jest.fn(async () => ({ supabase, officer: { email: 'pres@gsu.edu', role: 'admin' } })),
  requireStaff: jest.fn(async () => ({ supabase, officer: { email: 'pres@gsu.edu', role: 'admin' } })),
}))
jest.mock('../app/lib/dashboard/queries', () => ({
  listEvents: jest.fn(async () => ({ upcoming: [{ id: 'pin-1', name: 'Fall Field Day' }], past: [] })),
}))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn() }))

describe('Checking in', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    insertResult = { error: null }
    doorRules = null
  })

  it('turns guests away once they’re switched off in Settings, and still takes members', async () => {
    doorRules = { walkins_allowed: false, walkins_become_members: false }
    const guest = await checkIn(form({ name: 'Sam Kim', event_id: 'pin-1' }))
    expect(guest.ok).toBe(false)
    expect(insert).not.toHaveBeenCalled()
    const member = await checkIn(form({ name: 'Sam Kim', event_id: 'pin-1', member_id: 'm1' }))
    expect(member.ok).toBe(true)
    expect(insert.mock.calls[0][0]).toMatchObject({ member_id: 'm1' })
  })

  it('keeps the event’s name, which PIN won’t have once it ends', async () => {
    await checkIn(form({ name: 'Sam Kim', event_id: 'pin-1' }))
    expect(insert.mock.calls[0][0]).toMatchObject({ event_id: 'pin-1', event_name: 'Fall Field Day', name: 'Sam Kim' })
  })

  it('still checks people in when the event can’t be found', async () => {
    const result = await checkIn(form({ name: 'Sam Kim', event_id: 'pin-404' }))
    expect(result.ok).toBe(true)
    expect(insert.mock.calls[0][0]).toMatchObject({ event_name: null })
  })
})

describe('Officer actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    insertResult = { error: null }
    updateResult = { data: [{ email: 'treas@gsu.edu' }], error: null }
  })

  it('edits name, title, and role, never the email', async () => {
    const result = await updateOfficer('treas@gsu.edu', form({ email: 'other@gsu.edu', name: 'Sam', title: 'Secretary', role: 'admin' }))
    expect(result).toEqual({ ok: true, message: 'Saved Sam' })
    expect(update).toHaveBeenCalledWith({ name: 'Sam', title: 'Secretary', role: 'admin' })
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('won’t let you change your own role, whatever the case of the email', async () => {
    const result = await updateOfficer('PRES@gsu.edu', form({ email: 'pres@gsu.edu', role: 'officer' }))
    expect(result).toEqual({ ok: false, error: 'You can’t change your own role; ask another admin.' })
    expect(update).not.toHaveBeenCalled()
  })

  it('lets you change your own name and title', async () => {
    updateResult = { data: [{ email: 'pres@gsu.edu' }], error: null }
    const result = await updateOfficer('pres@gsu.edu', form({ email: 'pres@gsu.edu', name: 'Jordan', title: 'Chair', role: 'admin' }))
    expect(result.ok).toBe(true)
    expect(update).toHaveBeenCalledWith({ name: 'Jordan', title: 'Chair', role: 'admin' })
  })

  it('says so when the officer has since been removed', async () => {
    updateResult = { data: [], error: null }
    const result = await updateOfficer('gone@gsu.edu', form({ email: 'gone@gsu.edu', role: 'officer' }))
    expect(result).toEqual({ ok: false, error: 'They’re not on the officer list anymore.' })
    expect(log).not.toHaveBeenCalled()
  })

  it('giving access to someone already listed doesn’t overwrite them', async () => {
    insertResult = { error: { code: '23505', message: 'duplicate key' } }
    const result = await saveOfficer(form({ email: 'pres@gsu.edu', role: 'officer' }))
    expect(result).toEqual({ ok: false, errors: { email: 'They’re already on the list. Edit them there instead.' } })
    expect(update).not.toHaveBeenCalled()
  })
})
