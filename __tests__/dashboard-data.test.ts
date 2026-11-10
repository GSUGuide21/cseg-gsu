import { BUILT_IN_CLUB_DETAILS, clubDetailsFrom, instagramHandle } from '../app/lib/clubDetails'
import { attendanceByMember, isQuiet } from '../app/lib/dashboard/attendance'
import { mediaUsage } from '../app/lib/dashboard/mediaUsage'

describe('Club details', () => {
  it('keeps the site’s own until officers fill them in', () => {
    expect(clubDetailsFrom(null)).toEqual(BUILT_IN_CLUB_DETAILS)
    expect(clubDetailsFrom({ tagline: '', meeting_info: null, contact_email: null, instagram_url: null })).toEqual(BUILT_IN_CLUB_DETAILS)
  })

  it('puts what officers saved over them, field by field', () => {
    const details = clubDetailsFrom({ tagline: null, meeting_info: 'Thursdays at 5', contact_email: 'hi@gsu.edu', instagram_url: null })
    expect(details.meetingInfo).toBe('Thursdays at 5')
    expect(details.contactEmail).toBe('hi@gsu.edu')
    expect(details.tagline).toBe(BUILT_IN_CLUB_DETAILS.tagline)
    expect(details.instagramUrl).toBe(BUILT_IN_CLUB_DETAILS.instagramUrl)
  })

  it('reads the handle from an Instagram link', () => {
    expect(instagramHandle('https://www.instagram.com/cseg_gsu/')).toBe('@cseg_gsu')
    expect(instagramHandle('https://instagram.com/panthers?hl=en')).toBe('@panthers')
  })
})

describe('Which documents use which images', () => {
  const address = (path: string) => `https://abc.supabase.co/storage/v1/object/public/media/${path}`

  it('finds addresses in covers, bodies, and nested sections', () => {
    const used = mediaUsage([
      { title: 'Fall recap', fields: { cover_image_url: address('2026/10/a.jpg'), body: `{"src":"${address('2026/10/b.png')}"}` } },
      { title: 'About', fields: { sections: [{ body: `<img src="${address('2026/10/a.jpg')}">` }] } },
    ])
    expect(used).toEqual({ '2026/10/a.jpg': ['Fall recap', 'About'], '2026/10/b.png': ['Fall recap'] })
  })

  it('counts a document once, and ignores images hosted elsewhere', () => {
    const used = mediaUsage([{ title: 'Post', fields: { cover: address('a.jpg'), body: address('a.jpg'), other: 'https://example.com/b.jpg' } }])
    expect(used).toEqual({ 'a.jpg': ['Post'] })
  })
})

describe('Attendance', () => {
  it('counts events, not check-ins, and keeps the latest', () => {
    const attendance = attendanceByMember([
      { member_id: 'm1', event_id: 'e1', checked_in_at: '2026-09-01T00:00:00Z' },
      { member_id: 'm1', event_id: 'e1', checked_in_at: '2026-09-01T00:05:00Z' },
      { member_id: 'm1', event_id: 'e2', checked_in_at: '2026-10-01T00:00:00Z' },
      { member_id: null, event_id: 'e2', checked_in_at: '2026-10-02T00:00:00Z' },
    ])
    expect(attendance).toEqual({ m1: { events: 2, lastSeen: '2026-10-01T00:00:00Z' } })
  })

  it('calls someone quiet after 90 days without a check-in', () => {
    const now = Date.parse('2026-11-01T00:00:00Z')
    expect(isQuiet('2026-10-01T00:00:00Z', '2026-01-01', now)).toBe(false)
    expect(isQuiet('2026-07-01T00:00:00Z', '2026-01-01', now)).toBe(true)
  })

  it('gives someone who’s never come 90 days from when they joined', () => {
    const now = Date.parse('2026-11-01T00:00:00Z')
    expect(isQuiet(null, '2026-10-20', now)).toBe(false)
    expect(isQuiet(null, '2026-01-01', now)).toBe(true)
  })
})
