import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { Deck, SlideView } from '../app/(page)/presentations/Deck'
import { deckSettings, shownSlides } from '../app/lib/presentations'
import { parsePresentation, parseSlideNotes, parseSlides } from '../app/lib/dashboard/validate'
import { isReservedSlug } from '../app/lib/sitePages'

const form = (fields: Record<string, string>) => {
  const data = new FormData()
  for (const [k, v] of Object.entries({ title: 'Welcome Week', ...fields })) data.set(k, v)
  return data
}

describe('A presentation, as it’s saved', () => {
  it('makes its address from its title, and keeps its slides in order', () => {
    const slides = [
      { id: 'a', title: '  Who we are ', body: '{}' },
      { id: 'b', title: 'Join us', body: '' },
    ]
    const parsed = parsePresentation(form({ status: 'published', slides: JSON.stringify(slides) }))
    expect(parsed).toMatchObject({ ok: true, data: { slug: 'welcome-week', status: 'published', slides: [{ id: 'a', title: 'Who we are', body: '{}' }, { id: 'b', title: 'Join us', body: '' }] } })
  })

  it('lets a draft be empty, but not a published one', () => {
    expect(parsePresentation(form({ status: 'draft' })).ok).toBe(true)
    const parsed = parsePresentation(form({ status: 'published', slides: '[]' }))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.errors.slides).toBe('Add a slide before publishing.')
  })

  it('needs a title, and keeps the description short', () => {
    const parsed = parsePresentation(form({ title: ' ', description: 'x'.repeat(301) }))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(Object.keys(parsed.errors).sort()).toEqual(['description', 'slug', 'title'])
  })

  it('drops what isn’t a slide, and gives a slide without an id one', () => {
    expect(parseSlides('not json')).toEqual([])
    expect(parseSlides(JSON.stringify([null, 'x', { title: 'Only a title' }]))).toEqual([{ id: 'slide-1', title: 'Only a title', body: '' }])
  })

  it('is public unless it says otherwise, and takes only the three choices', () => {
    expect(parsePresentation(form({ status: 'draft' }))).toMatchObject({ ok: true, data: { visibility: 'public' } })
    expect(parsePresentation(form({ status: 'draft', visibility: 'private' }))).toMatchObject({ ok: true, data: { visibility: 'private' } })
    expect(parsePresentation(form({ status: 'draft', visibility: 'unlisted' }))).toMatchObject({ ok: true, data: { visibility: 'unlisted' } })
    const parsed = parsePresentation(form({ status: 'draft', visibility: 'everyone' }))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.errors.visibility).toBe('Pick who can see it.')
  })

  it('reads the schedule, and wants it to come down after it goes up', () => {
    expect(parsePresentation(form({ status: 'draft', publish_at: '2026-11-20T14:00:00Z', unpublish_at: '2026-11-27T14:00:00Z' }))).toMatchObject({
      ok: true,
      data: { publish_at: '2026-11-20T14:00:00.000Z', unpublish_at: '2026-11-27T14:00:00.000Z' },
    })
    expect(parsePresentation(form({ status: 'draft' }))).toMatchObject({ ok: true, data: { publish_at: null, unpublish_at: null } })
    const parsed = parsePresentation(form({ status: 'draft', publish_at: '2026-11-27T14:00:00Z', unpublish_at: '2026-11-20T14:00:00Z' }))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.errors.unpublish_at).toBe('Take it down after it goes up.')
  })

  it('keeps speaker notes only for slides that are there, and none that are empty', () => {
    const slides = [
      { id: 'a', title: 'One', body: '' },
      { id: 'b', title: 'Two', body: '' },
    ]
    expect(parseSlideNotes(JSON.stringify({ a: '  Welcome everyone  ', b: '   ', gone: 'A slide that was removed' }), slides)).toEqual({ a: 'Welcome everyone' })
    expect(parseSlideNotes('not json', slides)).toEqual({})
    expect(parseSlideNotes('["a"]', slides)).toEqual({})
    const parsed = parsePresentation(form({ status: 'draft', slides: JSON.stringify(slides), notes: JSON.stringify({ b: 'Ask for questions' }) }))
    expect(parsed).toMatchObject({ ok: true, data: { notes: { b: 'Ask for questions' } } })
  })

  it('keeps a slide’s layout, picture, and whether it’s hidden, and only what differs from a plain slide', () => {
    const sent = [
      { id: 'a', title: 'Cover', body: '', layout: 'title', image: 'https://x.test/a.png', hidden: true },
      { id: 'b', title: 'Plain', body: '', layout: 'content', image: 'javascript:alert(1)', hidden: false },
      { id: 'c', title: 'Odd', body: '', layout: 'spinning' },
    ]
    expect(parseSlides(JSON.stringify(sent))).toEqual([
      { id: 'a', title: 'Cover', body: '', layout: 'title', image: 'https://x.test/a.png', hidden: true },
      { id: 'b', title: 'Plain', body: '' },
      { id: 'c', title: 'Odd', body: '' },
    ])
  })

  it('won’t publish a deck whose slides are all hidden', () => {
    const slides = JSON.stringify([{ id: 'a', title: 'Backup', body: '', hidden: true }])
    expect(parsePresentation(form({ status: 'draft', slides })).ok).toBe(true)
    const parsed = parsePresentation(form({ status: 'published', slides }))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.errors.slides).toBe('Every slide is hidden. Show one before publishing.')
    expect(shownSlides(JSON.parse(slides))).toEqual([])
  })

  it('reads the deck’s theme, transition, and autoplay, falling back to the defaults', () => {
    expect(deckSettings(null)).toEqual({ theme: 'site', transition: 'fade', autoplay: 0 })
    expect(deckSettings({ theme: 'brand', transition: 'slide', autoplay: '10' })).toEqual({ theme: 'brand', transition: 'slide', autoplay: 10 })
    expect(deckSettings({ theme: 'neon', transition: 'spin', autoplay: 7 })).toEqual({ theme: 'site', transition: 'fade', autoplay: 0 })
    const parsed = parsePresentation(form({ status: 'draft', settings: JSON.stringify({ theme: 'dark', autoplay: 30 }) }))
    expect(parsed).toMatchObject({ ok: true, data: { settings: { theme: 'dark', transition: 'fade', autoplay: 30 } } })
    expect(parsePresentation(form({ status: 'draft', settings: 'not json' }))).toMatchObject({ ok: true, data: { settings: { theme: 'site' } } })
  })

  it('keeps /presentations for the site', () => {
    expect(isReservedSlug('presentations')).toBe(true)
  })
})

describe('Playing a presentation', () => {
  const slides = [
    { id: 'a', title: 'Who we are' },
    { id: 'b', title: 'What we do' },
    { id: 'c', title: 'Join us' },
  ]
  const play = () => render(<Deck slides={slides} bodies={slides.map((s) => <p key={s.id}>About {s.title}</p>)} />)
  const shown = () => screen.getByRole('group', { name: /^Slide \d of 3/ }).getAttribute('aria-label')

  beforeEach(() => window.history.replaceState(null, '', '/presentations/welcome'))

  it('shows one slide at a time, and moves with the buttons', () => {
    play()
    expect(shown()).toBe('Slide 1 of 3: Who we are')
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(shown()).toBe('Slide 2 of 3: What we do')
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(window.location.hash).toBe('#2')
  })

  it('moves with the keyboard, and stops at either end', () => {
    play()
    fireEvent.keyDown(window, { key: 'End' })
    expect(shown()).toBe('Slide 3 of 3: Join us')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(shown()).toBe('Slide 3 of 3: Join us')
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'PageUp' })
    expect(shown()).toBe('Slide 1 of 3: Who we are')
    expect(window.location.hash).toBe('')
  })

  it('opens on the slide a link names', async () => {
    window.history.replaceState(null, '', '/presentations/welcome#3')
    await act(async () => void play())
    expect(shown()).toBe('Slide 3 of 3: Join us')
  })

  it('leaves the keys alone while someone is typing', () => {
    play()
    const input = document.body.appendChild(document.createElement('input'))
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(shown()).toBe('Slide 1 of 3: Who we are')
    input.remove()
  })

  it('shows every slide at a glance, and jumps to the one picked', () => {
    play()
    fireEvent.click(screen.getByRole('button', { name: 'All slides' }))
    const all = screen.getByRole('navigation', { name: 'All slides' })
    expect(within(all).getAllByRole('button')).toHaveLength(3)
    expect(within(all).getByRole('button', { name: /Who we are/ })).toHaveAttribute('aria-current', 'true')
    fireEvent.click(within(all).getByRole('button', { name: /Join us/ }))
    expect(screen.queryByRole('navigation', { name: 'All slides' })).not.toBeInTheDocument()
    expect(shown()).toBe('Slide 3 of 3: Join us')
  })

  it('turns the slide on a sideways swipe, not on a scroll', () => {
    play()
    const frame = screen.getByRole('group', { name: /^Slide 1 of 3/ }).parentElement!
    const swipe = (from: [number, number], to: [number, number]) => {
      fireEvent.touchStart(frame, { touches: [{ clientX: from[0], clientY: from[1] }] })
      fireEvent.touchEnd(frame, { changedTouches: [{ clientX: to[0], clientY: to[1] }] })
    }
    swipe([200, 100], [190, 300])
    expect(shown()).toBe('Slide 1 of 3: Who we are')
    swipe([200, 100], [80, 110])
    expect(shown()).toBe('Slide 2 of 3: What we do')
  })

  it('shows the presenter each slide’s notes, when it’s given them', () => {
    render(<Deck slides={slides} bodies={[]} notes={['Welcome everyone', '', 'Ask for questions']} />)
    const notes = screen.getByRole('complementary', { name: 'Speaker notes' })
    expect(within(notes).getByText('Welcome everyone')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(within(notes).getByText('None for this slide.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(within(notes).getByText('Ask for questions')).toBeInTheDocument()
  })

  it('has no notes on the site, where none are given', () => {
    play()
    expect(screen.queryByRole('complementary', { name: 'Speaker notes' })).not.toBeInTheDocument()
  })

  it('tells the presenter what’s next, and keeps a clock', () => {
    jest.useFakeTimers()
    render(<Deck slides={slides} bodies={[]} notes={['', '', '']} />)
    const panel = screen.getByRole('complementary', { name: 'Speaker notes' })
    expect(within(panel).getByText('What we do')).toBeInTheDocument()
    act(() => void jest.advanceTimersByTime(65_000))
    expect(within(panel).getByRole('timer')).toHaveTextContent('1:05')
    fireEvent.click(within(panel).getByRole('button', { name: 'Start the clock over' }))
    expect(within(panel).getByRole('timer')).toHaveTextContent('0:00')
    fireEvent.keyDown(window, { key: 'End' })
    expect(within(panel).getByText('The end')).toBeInTheDocument()
    jest.useRealTimers()
  })

  it('plays by itself when the deck is set to, round and round, until paused', () => {
    jest.useFakeTimers()
    render(<Deck slides={slides} bodies={[]} settings={{ theme: 'dark', transition: 'none', autoplay: 5 }} />)
    expect(screen.getByRole('region', { name: 'Slides' })).toHaveClass('deck-theme-dark')
    act(() => void jest.advanceTimersByTime(6000))
    expect(shown()).toBe('Slide 1 of 3: Who we are')
    fireEvent.click(screen.getByRole('button', { name: /^Play by itself/ }))
    act(() => void jest.advanceTimersByTime(5000))
    expect(shown()).toBe('Slide 2 of 3: What we do')
    act(() => void jest.advanceTimersByTime(5000))
    act(() => void jest.advanceTimersByTime(5000))
    expect(shown()).toBe('Slide 1 of 3: Who we are')
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    act(() => void jest.advanceTimersByTime(20_000))
    expect(shown()).toBe('Slide 1 of 3: Who we are')
    jest.useRealTimers()
  })

  it('has no Play button on a deck that doesn’t play by itself', () => {
    play()
    expect(screen.queryByRole('button', { name: /^Play by itself/ })).not.toBeInTheDocument()
  })

  it('lays a slide out as its layout says', () => {
    const { rerender } = render(<SlideView slide={{ id: 'a', title: 'Campus guides', layout: 'image-right' }}>Words</SlideView>)
    expect(screen.getByText('No picture yet')).toBeInTheDocument()
    rerender(<SlideView slide={{ id: 'a', title: 'Campus guides', layout: 'image-right', image: 'https://x.test/a.png' }}>Words</SlideView>)
    expect(document.querySelector('img')).toHaveAttribute('src', 'https://x.test/a.png')
    rerender(<SlideView slide={{ id: 'a', title: 'Campus guides', layout: 'image-full', image: 'javascript:alert(1)' }}>Words</SlideView>)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Campus guides' })).toBeInTheDocument()
  })

  it('says so when there are no slides', () => {
    render(<Deck slides={[]} bodies={[]} />)
    expect(screen.getByText('This presentation has no slides yet.')).toBeInTheDocument()
  })
})
