import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { Deck } from '../app/(page)/presentations/Deck'
import { parsePresentation, parseSlides } from '../app/lib/dashboard/validate'
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

  it('says so when there are no slides', () => {
    render(<Deck slides={[]} bodies={[]} />)
    expect(screen.getByText('This presentation has no slides yet.')).toBeInTheDocument()
  })
})
