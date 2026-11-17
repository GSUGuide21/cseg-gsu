import { render, screen, within } from '@testing-library/react'

import { ResultsBars } from '../app/(page)/polls/ResultsBars'
import { tourFromRow } from '../app/lib/content/public'
import { isOpen, type FormField, type PollQuestion } from '../app/lib/content/types'
import { parseAlbum, parseContent, parseFormAnswers, parseFormDefinition, parseLibraryItem, parseOpportunity, parsePoll, parsePollAnswers, parseTestimonial, parseTour } from '../app/lib/content/validate'
import { TOURS, tourFromLink } from '../app/lib/data/tour'
import { isReservedSlug } from '../app/lib/sitePages'

jest.mock('../app/lib/supabase/server', () => ({ createPublicClient: () => null, createClient: async () => null }))

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData()
  for (const [k, v] of Object.entries(fields)) for (const one of Array.isArray(v) ? v : [v]) data.append(k, one)
  return data
}
const errorsOf = (parsed: { ok: boolean; errors?: Record<string, string> }) => (parsed.ok ? [] : Object.keys(parsed.errors ?? {}).sort())

describe('Albums', () => {
  it('keeps photos that have a picture, and makes the address from the title', () => {
    const photos = JSON.stringify([{ src: 'https://x.test/a.jpg', alt: '  At the table ', caption: '' }, { src: 'javascript:alert(1)', alt: 'Bad' }, { alt: 'No picture' }, 'nope'])
    expect(parseAlbum(form({ title: 'Fall Social', photos, published: 'on', taken_on: '2026-10-30' }))).toMatchObject({
      ok: true,
      data: { slug: 'fall-social', taken_on: '2026-10-30', published: true, photos: [{ src: 'https://x.test/a.jpg', alt: 'At the table', caption: '' }] },
    })
  })

  it('won’t show an album with no photos, but keeps one hidden', () => {
    expect(errorsOf(parseAlbum(form({ title: 'Empty', published: 'on' })))).toEqual(['photos'])
    expect(parseAlbum(form({ title: 'Empty' })).ok).toBe(true)
    expect(errorsOf(parseAlbum(form({ title: '', taken_on: 'yesterday' })))).toEqual(['slug', 'taken_on', 'title'])
  })
})

describe('Tours', () => {
  const stop = (placeId: string, title = 'Go here') => ({ placeId, title, why: 'Because', tip: '' })

  it('needs two titled stops at places, and falls back to the name for the short name', () => {
    expect(errorsOf(parseTour(form({ title: 'Commuter loop', stops: JSON.stringify([stop('library-north')]) })))).toEqual(['stops'])
    expect(errorsOf(parseTour(form({ title: 'Commuter loop', stops: JSON.stringify([stop('a'), stop('b', '')]) })))).toEqual(['stops'])
    expect(parseTour(form({ title: 'Commuter loop', stops: JSON.stringify([stop('a'), stop(''), stop('b')]), sort: '20' }))).toMatchObject({
      ok: true,
      data: { slug: 'commuter-loop', label: 'Commuter loop', sort: 20, stops: [{ placeId: 'a' }, { placeId: 'b' }] },
    })
  })

  it('reads on the map as the built-in ones do, and links find it', () => {
    const tour = tourFromRow({ slug: 'night', title: 'After dark', label: 'Night', intro: 'Safe routes.', stops: [stop('gsu-police'), { ...stop('marta-georgia-state'), tip: 'Last train 1am' }] })
    expect(tour).toEqual({
      id: 'night',
      title: 'After dark',
      label: 'Night',
      intro: 'Safe routes.',
      stops: [
        { placeId: 'gsu-police', title: 'Go here', why: 'Because' },
        { placeId: 'marta-georgia-state', title: 'Go here', why: 'Because', tip: 'Last train 1am' },
      ],
    })
    expect(tourFromLink('night', '2', [tour])).toEqual({ tour, step: 1 })
    expect(tourFromLink('night', '2')).toBeUndefined()
    expect(tourFromLink(TOURS[0].id)?.tour).toBe(TOURS[0])
  })
})

describe('Library, testimonials, and opportunities', () => {
  it('needs a document’s link to be https', () => {
    expect(errorsOf(parseLibraryItem(form({ title: 'Flyer' })))).toEqual(['url'])
    expect(errorsOf(parseLibraryItem(form({ title: 'Flyer', url: 'http://x.test/f.pdf' })))).toEqual(['url'])
    expect(parseLibraryItem(form({ title: 'Flyer', url: 'https://x.test/f.pdf', file_name: 'f.pdf', category: 'Forms', published: 'on' }))).toMatchObject({
      ok: true,
      data: { url: 'https://x.test/f.pdf', file_name: 'f.pdf', category: 'Forms', published: true, sort: 0 },
    })
  })

  it('needs a testimonial’s name and words', () => {
    expect(errorsOf(parseTestimonial(form({})))).toEqual(['name', 'quote'])
    expect(parseTestimonial(form({ name: 'Sam', quote: 'Found my people.', photo_url: 'ftp://x/y.png' }))).toMatchObject({ ok: true, data: { role: null, photo_url: null } })
  })

  it('takes one of the kinds of opportunity, and a real day for the deadline', () => {
    expect(errorsOf(parseOpportunity(form({ title: 'Grant', kind: 'lottery', deadline: 'soon', url: 'x.test' })))).toEqual(['deadline', 'kind', 'url'])
    expect(parseOpportunity(form({ title: 'Grant', kind: 'scholarship', deadline: '2026-12-01' }))).toMatchObject({ ok: true, data: { kind: 'scholarship', deadline: '2026-12-01', url: null } })
  })
})

describe('Polls and quizzes', () => {
  const questions = [
    { id: 'day', text: 'Which day?', options: 'Thursday\nFriday\n\nFriday', correct: 'Friday' },
    { id: 'place', text: 'Where?', options: ['Library', 'Student Center'], correct: 'Nowhere' },
  ]

  it('reads options a line each, without blanks or repeats', () => {
    const parsed = parsePoll(form({ title: 'Spring social', questions: JSON.stringify(questions), results_public: 'on' }))
    expect(parsed).toMatchObject({
      ok: true,
      data: { row: { kind: 'poll', slug: 'spring-social', results_public: true, published: false, questions: [{ id: 'day', options: ['Thursday', 'Friday'] }, { id: 'place', options: ['Library', 'Student Center'] }] }, correct: {} },
    })
  })

  it('keeps a quiz’s right answers apart from it, and wants one for every question', () => {
    expect(errorsOf(parsePoll(form({ title: 'Trivia', kind: 'quiz', questions: JSON.stringify(questions) })))).toEqual(['questions'])
    const fixed = [questions[0], { ...questions[1], correct: 'Library' }]
    const parsed = parsePoll(form({ title: 'Trivia', kind: 'quiz', questions: JSON.stringify(fixed) }))
    expect(parsed).toMatchObject({ ok: true, data: { correct: { day: 'Friday', place: 'Library' } } })
    if (parsed.ok) expect(JSON.stringify(parsed.data.row)).not.toContain('correct')
    // Saved through the shared action, the answers still come back beside the row, not in it
    expect(parseContent('poll', form({ title: 'Trivia', kind: 'quiz', questions: JSON.stringify(fixed) }))).toMatchObject({ ok: true, data: { correct: { day: 'Friday', place: 'Library' } } })
  })

  it('wants two options a question, and a question before it opens', () => {
    expect(errorsOf(parsePoll(form({ title: 'Thin', questions: JSON.stringify([{ id: 'a', text: 'Yes?', options: 'Yes' }]) })))).toEqual(['questions'])
    expect(errorsOf(parsePoll(form({ title: 'Empty', published: 'on' })))).toEqual(['questions'])
    expect(parsePoll(form({ title: 'Empty' })).ok).toBe(true)
  })

  it('takes only an answer that is one of the question’s options, for every question', () => {
    const asked: PollQuestion[] = [
      { id: 'day', text: 'Which day?', options: ['Thursday', 'Friday'] },
      { id: 'place', text: 'Where?', options: ['Library', 'Student Center'] },
    ]
    expect(parsePollAnswers(asked, form({ day: 'Friday', place: 'Library', extra: 'x' }))).toEqual({ ok: true, data: { day: 'Friday', place: 'Library' } })
    expect(errorsOf(parsePollAnswers(asked, form({ day: 'Sunday' })))).toEqual(['day', 'place'])
  })

  it('closes when its time comes', () => {
    expect(isOpen({ closes_at: null })).toBe(true)
    expect(isOpen({ closes_at: '2026-11-01T00:00:00Z' }, Date.parse('2026-11-02T00:00:00Z'))).toBe(false)
    expect(isOpen({ closes_at: '2026-11-03T00:00:00Z' }, Date.parse('2026-11-02T00:00:00Z'))).toBe(true)
  })

  it('draws how everyone answered, marking the right answer and the reader’s own', () => {
    render(
      <ResultsBars
        questions={[{ id: 'day', text: 'Which day?', options: ['Thursday', 'Friday'] }]}
        results={{ total: 4, counts: { day: { Thursday: 1, Friday: 3 } } }}
        correct={{ day: 'Friday' }}
        picked={{ day: 'Thursday' }}
      />
    )
    const [thursday, friday] = screen.getAllByRole('listitem').slice(1)
    expect(thursday).toHaveTextContent('Thursday(your answer)1 · 25%')
    expect(friday).toHaveTextContent('Friday3 · 75%')
    expect(within(friday).getByLabelText('The right answer')).toBeInTheDocument()
  })
})

describe('Forms', () => {
  const fields: FormField[] = [
    { id: 'name', label: 'Your name', type: 'text', required: true, options: [] },
    { id: 'email', label: 'Email', type: 'email', required: false, options: [] },
    { id: 'shirt', label: 'Shirt size', type: 'select', required: true, options: ['S', 'M', 'L'] },
    { id: 'days', label: 'Days you can help', type: 'checkboxes', required: true, options: ['Mon', 'Tue'] },
    { id: 'agree', label: 'I’ll show up', type: 'checkbox', required: true, options: [] },
    { id: 'guests', label: 'Guests', type: 'number', required: false, options: [] },
  ]

  it('keeps a form’s questions with their types, and options only where they’re picked from', () => {
    const sent = [
      { id: 'name', label: 'Your name', type: 'text', required: true, options: 'ignored' },
      { id: 'shirt', label: 'Shirt size', type: 'select', options: 'S\nM\nL' },
      { label: 'Odd', type: 'hologram' },
      { label: '' },
    ]
    expect(parseFormDefinition(form({ title: 'Volunteer sign-up', fields: JSON.stringify(sent), published: 'on' }))).toMatchObject({
      ok: true,
      data: {
        slug: 'volunteer-sign-up',
        published: true,
        fields: [
          { id: 'name', type: 'text', required: true, options: [] },
          { id: 'shirt', type: 'select', required: false, options: ['S', 'M', 'L'] },
          { id: 'f3', label: 'Odd', type: 'text', options: [] },
        ],
      },
    })
    expect(errorsOf(parseFormDefinition(form({ title: 'Thin', fields: JSON.stringify([{ label: 'Pick', type: 'radio', options: 'Only one' }]) })))).toEqual(['fields'])
    expect(errorsOf(parseFormDefinition(form({ title: 'Empty', published: 'on' })))).toEqual(['fields'])
  })

  it('checks what people send against each question', () => {
    expect(parseFormAnswers(fields, form({ name: ' Jo ', email: 'jo@gsu.edu', shirt: 'M', days: ['Mon', 'Tue', 'Sun'], agree: 'on', guests: '2' }))).toEqual({
      ok: true,
      data: { name: 'Jo', email: 'jo@gsu.edu', shirt: 'M', days: ['Mon', 'Tue'], agree: 'Yes', guests: '2' },
    })
    expect(errorsOf(parseFormAnswers(fields, form({ email: 'nope', shirt: 'XXL', guests: 'two' })))).toEqual(['agree', 'days', 'email', 'guests', 'name', 'shirt'])
  })
})

describe('Addresses', () => {
  it('keeps the new sections’ addresses for the site', () => {
    for (const slug of ['albums', 'library', 'opportunities', 'polls', 'forms']) expect(isReservedSlug(slug)).toBe(true)
  })
})
