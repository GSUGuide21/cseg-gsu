import { BUILT_IN_CLUB_DETAILS, clubDetailsFrom, formatDollars } from '@/lib/clubDetails'
import { currentTerm, duesSummary, inTerm, overlappingTerm, sortSponsors, sponsorActive } from '@/lib/dashboard/terms'
import { parseDues, parseFaq, parseJoinRequest, parseMinutes, parseOfficer, parseRedirect, parseRsvp, parseSettings, parseSponsor, parseTerm, redirectPathFrom } from '@/lib/dashboard/validate'

const form = (fields: Record<string, string | string[]>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) for (const value of [v].flat()) f.append(k, value)
  return f
}

const MEMBER = '11111111-1111-4111-8111-111111111111'
const TERM = '22222222-2222-4222-8222-222222222222'

describe('settings, a part at a time', () => {
  it('saves only the part a form is for, so the rest stays as it was', () => {
    const details = parseSettings(form({ tagline: 'Hi', contact_email: 'Hi@GSU.edu' }))
    expect(details).toEqual({ ok: true, data: { tagline: 'Hi', meeting_info: null, contact_email: 'hi@gsu.edu', instagram_url: null } })
    const contact = parseSettings(form({ section: 'contact', contact_reply: 'Thanks!' }))
    expect(contact).toEqual({ ok: true, data: { contact_form_open: false, contact_reply: 'Thanks!' } })
  })

  it('takes full links for the club’s other pages, and says which one isn’t', () => {
    const parsed = parseSettings(form({ section: 'links', discord_url: 'https://discord.gg/abc', youtube_url: 'youtube.com/@cseg' }))
    expect(parsed).toMatchObject({ ok: false, errors: { youtube_url: expect.any(String) } })
    if (!parsed.ok) expect(parsed.errors.discord_url).toBeUndefined()
    expect(parseSettings(form({ section: 'links', discord_url: 'https://discord.gg/abc' }))).toMatchObject({ ok: true, data: { discord_url: 'https://discord.gg/abc', pin_url: null } })
  })

  it('drops a notice’s link and last day when the notice is cleared', () => {
    const cleared = parseSettings(form({ section: 'banner', banner_message: '  ', banner_href: '/events', banner_until: '2026-12-01', banner_tone: 'warning' }))
    expect(cleared).toEqual({ ok: true, data: { banner_message: null, banner_href: null, banner_tone: 'warning', banner_until: null } })
    const bad = parseSettings(form({ section: 'banner', banner_message: 'Moved', banner_href: 'events', banner_tone: 'loud' }))
    expect(bad).toMatchObject({ ok: false, errors: { banner_href: expect.any(String), banner_tone: expect.any(String) } })
  })

  it('reads dues as dollars and cents, and nothing else', () => {
    expect(parseSettings(form({ section: 'membership', accepting_members: 'on', dues_amount: '$12.50' }))).toEqual({ ok: true, data: { accepting_members: true, dues_amount: 12.5 } })
    expect(parseSettings(form({ section: 'membership', dues_amount: '' }))).toEqual({ ok: true, data: { accepting_members: false, dues_amount: null } })
    expect(parseSettings(form({ section: 'membership', dues_amount: 'fifteen' }))).toMatchObject({ ok: false, errors: { dues_amount: expect.any(String) } })
  })

  it('won’t add guests to the roster while guests are turned away', () => {
    expect(parseSettings(form({ section: 'checkin', walkins_become_members: 'on' }))).toEqual({ ok: true, data: { walkins_allowed: false, walkins_become_members: false } })
    expect(parseSettings(form({ section: 'nope' })).ok).toBe(false)
  })

  it('knows editors, officers, and admins', () => {
    expect(parseOfficer(form({ email: 'web@gsu.edu', role: 'editor' }))).toMatchObject({ ok: true, data: { role: 'editor' } })
    expect(parseOfficer(form({ email: 'web@gsu.edu', role: 'owner' }))).toMatchObject({ ok: false, errors: { role: 'Pick a role.' } })
  })
})

describe('what the site shows from Settings', () => {
  it('lists every place the club is online, saved ones over the site’s own', () => {
    const details = clubDetailsFrom({ discord_url: 'https://discord.gg/abc', pin_url: null })
    expect(details.links.discord).toBe('https://discord.gg/abc')
    expect(details.links.pin).toBe(BUILT_IN_CLUB_DETAILS.links.pin)
    expect(details.links.youtube).toBe('')
  })

  it('shows a notice through its last day, and not after', () => {
    const row = { banner_message: 'Meeting moved', banner_href: '/events', banner_tone: 'warning' as const, banner_until: '2026-11-12' }
    expect(clubDetailsFrom(row, '2026-11-12').banner).toEqual({ message: 'Meeting moved', href: '/events', tone: 'warning' })
    expect(clubDetailsFrom(row, '2026-11-13').banner).toBeNull()
    expect(clubDetailsFrom({ ...row, banner_until: null }, '2030-01-01').banner).not.toBeNull()
    expect(clubDetailsFrom({ banner_message: '   ' }).banner).toBeNull()
  })

  it('takes members and messages until officers say otherwise', () => {
    expect(clubDetailsFrom(null)).toMatchObject({ acceptingMembers: true, contactFormOpen: true, duesAmount: null })
    expect(clubDetailsFrom({ accepting_members: false, contact_form_open: false, dues_amount: 15 })).toMatchObject({ acceptingMembers: false, contactFormOpen: false, duesAmount: 15 })
    expect(formatDollars(15)).toBe('$15')
    expect(formatDollars(12.5)).toBe('$12.50')
  })
})

describe('terms', () => {
  const fall = { id: 'fall', name: 'Fall 2026', starts_on: '2026-08-24', ends_on: '2026-12-15' }
  const spring = { id: 'spring', name: 'Spring 2027', starts_on: '2027-01-11', ends_on: '2027-05-05' }

  it('finds the one today falls in', () => {
    expect(currentTerm([spring, fall], '2026-11-10')).toBe(fall)
    expect(currentTerm([spring, fall], '2027-01-11')).toBe(spring)
  })

  it('between terms keeps the one just finished; before the first, the one coming', () => {
    expect(currentTerm([spring, fall], '2026-12-25')).toBe(fall)
    expect(currentTerm([spring, fall], '2026-06-01')).toBe(fall)
    expect(currentTerm([], '2026-11-10')).toBeNull()
  })

  it('tells whether a day or a time is in a term', () => {
    expect(inTerm(fall, '2026-12-15T23:00:00Z')).toBe(true)
    expect(inTerm(fall, '2026-12-16')).toBe(false)
  })

  it('catches terms that share a day, apart from the one being edited', () => {
    expect(overlappingTerm([fall, spring], { starts_on: '2026-12-15', ends_on: '2027-01-05' })).toBe(fall)
    expect(overlappingTerm([fall, spring], { starts_on: '2026-12-16', ends_on: '2027-01-10' })).toBeUndefined()
    expect(overlappingTerm([fall, spring], { id: 'fall', starts_on: '2026-08-20', ends_on: '2026-12-15' })).toBeUndefined()
  })

  it('reads a term’s name and its dates, in order', () => {
    expect(parseTerm(form({ name: 'Fall 2026', dates: ['2026-08-24', '2026-12-15'] }))).toEqual({ ok: true, data: { name: 'Fall 2026', starts_on: '2026-08-24', ends_on: '2026-12-15' } })
    expect(parseTerm(form({ name: '', dates: ['2026-12-15', '2026-08-24'] }))).toMatchObject({ ok: false, errors: { name: expect.any(String), dates: expect.any(String) } })
  })
})

describe('dues', () => {
  it('records an amount, a day, and how it was paid', () => {
    const parsed = parseDues(form({ member_id: MEMBER, term_id: TERM, amount: '15', method: 'card', paid_on: '2026-09-03', note: ' at tabling ' }))
    expect(parsed).toEqual({ ok: true, data: { member_id: MEMBER, term_id: TERM, amount: 15, method: 'card', note: 'at tabling', paid_on: '2026-09-03' } })
  })

  it('counts waived dues as paid, at nothing, whatever amount was typed', () => {
    expect(parseDues(form({ member_id: MEMBER, term_id: TERM, amount: '15', method: 'waived' }))).toMatchObject({ ok: true, data: { amount: 0, method: 'waived' } })
  })

  it('needs a member, a term, and an amount', () => {
    const parsed = parseDues(form({ member_id: 'sam', term_id: '', amount: '-5' }))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(Object.keys(parsed.errors).sort()).toEqual(['amount', 'member_id', 'term_id'])
  })

  it('sums up a term: who’s paid of those expected to, and what came in', () => {
    const summary = duesSummary(
      ['m1', 'm2', 'm3'],
      [
        { member_id: 'm1', amount: 15, method: 'cash' },
        { member_id: 'm2', amount: 0, method: 'waived' },
        // Someone inactive who paid anyway: money in, but not one of the expected
        { member_id: 'm9', amount: 15, method: 'card' },
      ]
    )
    expect(summary).toEqual({ expected: 3, paid: 2, waived: 1, collected: 30 })
  })
})

describe('requests to join and RSVPs, as sent from the site', () => {
  it('takes a name and an email, and whatever else was offered', () => {
    const parsed = parseJoinRequest(form({ name: ' Sam Kim ', email: 'Sam@Student.GSU.edu', major: 'Biology', year: 'Junior', message: '' }))
    expect(parsed).toMatchObject({ ok: true, bot: false, data: { name: 'Sam Kim', email: 'sam@student.gsu.edu', major: 'Biology', year: 'Junior', message: null } })
  })

  it('says what’s missing, and spots a bot by the hidden field', () => {
    expect(parseJoinRequest(form({ name: '', email: 'nope', year: 'Fifth' }))).toMatchObject({ ok: false, errors: { name: expect.any(String), email: expect.any(String), year: expect.any(String) } })
    expect(parseJoinRequest(form({ name: 'Bot', email: 'bot@x.co', website: 'https://spam.example' })).bot).toBe(true)
  })

  it('reads an RSVP: the event, a name, and an email', () => {
    expect(parseRsvp(form({ event_id: 'game-night-2026-11-20', name: 'Sam', email: 'SAM@gsu.edu' }))).toMatchObject({ ok: true, bot: false, data: { event_id: 'game-night-2026-11-20', name: 'Sam', email: 'sam@gsu.edu' } })
    expect(parseRsvp(form({ name: 'Sam', email: '' }))).toMatchObject({ ok: false, errors: { event_id: expect.any(String), email: expect.any(String) } })
  })
})

describe('questions, redirects, minutes, and sponsors, as typed', () => {
  it('needs a question and its answer', () => {
    expect(parseFaq(form({ question: ' Who  can join? ', answer: 'Any student.', published: 'on' }))).toEqual({ ok: true, data: { question: 'Who can join?', answer: 'Any student.', published: true } })
    expect(parseFaq(form({ question: '', answer: '' }))).toMatchObject({ ok: false, errors: { question: expect.any(String), answer: expect.any(String) } })
  })

  it('reads an address however it’s pasted', () => {
    expect(redirectPathFrom('Welcome-Week/')).toBe('/welcome-week')
    expect(redirectPathFrom('https://cseg.example/Fall/Kickoff?utm=x#top')).toBe('/fall/kickoff')
    expect(redirectPathFrom('/')).toBe('/')
  })

  it('forwards an address on the site to a page here or a link elsewhere', () => {
    expect(parseRedirect(form({ from_path: '/Welcome-Week/', to_path: '/events', note: '' }))).toEqual({ ok: true, data: { from_path: '/welcome-week', to_path: '/events', note: null } })
    expect(parseRedirect(form({ from_path: 'flyer', to_path: 'https://pin.gsu.edu/event/1' }))).toMatchObject({ ok: true, data: { from_path: '/flyer' } })
  })

  it('won’t forward the site’s own addresses, an address to itself, or to somewhere that isn’t a link', () => {
    expect(parseRedirect(form({ from_path: '/dashboard/members', to_path: '/' }))).toMatchObject({ ok: false, errors: { from_path: 'That address belongs to the site itself.' } })
    expect(parseRedirect(form({ from_path: '/', to_path: '/events' }))).toMatchObject({ ok: false, errors: { from_path: expect.any(String) } })
    expect(parseRedirect(form({ from_path: '/a', to_path: '/A/' }))).toMatchObject({ ok: false, errors: { to_path: 'That’s the same address.' } })
    expect(parseRedirect(form({ from_path: '/a', to_path: 'javascript:alert(1)' }))).toMatchObject({ ok: false, errors: { to_path: expect.any(String) } })
  })

  it('keeps a meeting’s day, name, who came (each once), and notes', () => {
    const parsed = parseMinutes(form({ held_on: '2026-11-05', title: 'General body meeting', attendees: ['Sam', 'Jordan', 'Sam'], notes: 'Voted on the budget.', file_url: '' }))
    expect(parsed).toEqual({ ok: true, data: { held_on: '2026-11-05', title: 'General body meeting', attendees: ['Sam', 'Jordan'], notes: 'Voted on the budget.', file_url: null } })
    expect(parseMinutes(form({ held_on: 'last week', title: '', file_url: 'drive.google.com/x' }))).toMatchObject({ ok: false, errors: { held_on: expect.any(String), title: expect.any(String), file_url: expect.any(String) } })
  })

  it('takes a sponsor’s dates with either end open, in order', () => {
    expect(parseSponsor(form({ name: 'Panther Pizza', tier: 'partner', starts_on: '2026-09-01', published: 'on' }))).toMatchObject({ ok: true, data: { tier: 'partner', starts_on: '2026-09-01', ends_on: null, published: true } })
    expect(parseSponsor(form({ name: 'Panther Pizza', tier: 'gold', href: 'pizza.example', starts_on: '2026-09-01', ends_on: '2026-08-01' }))).toMatchObject({
      ok: false,
      errors: { tier: expect.any(String), href: expect.any(String), ends_on: expect.any(String) },
    })
  })

  it('shows a sponsor only inside its dates, the highest tier first', () => {
    expect(sponsorActive({ starts_on: null, ends_on: null }, '2026-11-10')).toBe(true)
    expect(sponsorActive({ starts_on: '2026-11-11', ends_on: null }, '2026-11-10')).toBe(false)
    expect(sponsorActive({ starts_on: null, ends_on: '2026-11-10' }, '2026-11-10')).toBe(true)
    expect(sponsorActive({ starts_on: null, ends_on: '2026-11-09' }, '2026-11-10')).toBe(false)
    const sorted = sortSponsors([
      { name: 'B', tier: 'supporter' as const, sort: 10 },
      { name: 'A', tier: 'presenting' as const, sort: 30 },
      { name: 'C', tier: 'partner' as const, sort: 20 },
      { name: 'D', tier: 'partner' as const, sort: 10 },
    ])
    expect(sorted.map((s) => s.name)).toEqual(['A', 'D', 'C', 'B'])
  })
})
