import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { Deck, SlideThumb, SlideView } from '../app/(page)/presentations/Deck'
import { deckSettings, shownSlides, slideChrome, toneOf } from '../app/lib/presentations'
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
      { id: 'b', title: 'Plain', body: '', layout: 'content', image: 'javascript:alert(1)', hidden: false, reveal: 'yes' },
      { id: 'r', title: 'Points', body: '', reveal: true },
      { id: 'c', title: 'Odd', body: '', layout: 'spinning' },
    ]
    expect(parseSlides(JSON.stringify(sent))).toEqual([
      { id: 'a', title: 'Cover', body: '', layout: 'title', image: 'https://x.test/a.png', hidden: true },
      { id: 'b', title: 'Plain', body: '' },
      { id: 'r', title: 'Points', body: '', reveal: true },
      { id: 'c', title: 'Odd', body: '' },
    ])
  })

  it('keeps a slide’s own background, transition, time, and second column, and drops what isn’t one', () => {
    const sent = [
      { id: 'a', title: 'Two', body: 'L', body2: 'R', layout: 'comparison', label: '  Driving ', label2: 'MARTA', bgColor: '#0B2A6F', transition: 'slide', advance: 10 },
      { id: 'b', title: 'Odd', body: '', bgColor: 'red', bgImage: 'http://x.test/a.png', transition: 'spin', advance: 7 },
      { id: 'c', title: 'Both', body: '', bgColor: '#ffffff', bgImage: 'https://x.test/b.png' },
    ]
    expect(parseSlides(JSON.stringify(sent))).toEqual([
      { id: 'a', title: 'Two', body: 'L', body2: 'R', layout: 'comparison', label: 'Driving', label2: 'MARTA', bgColor: '#0b2a6f', transition: 'slide', advance: 10 },
      { id: 'b', title: 'Odd', body: '' },
      // A picture wins over a colour
      { id: 'c', title: 'Both', body: '', bgImage: 'https://x.test/b.png' },
    ])
  })

  it('reads light words on a dark colour, and dark ones on a light colour', () => {
    expect(toneOf('#0b2a6f')).toBe('dark')
    expect(toneOf('#000000')).toBe('dark')
    expect(toneOf('#ffd166')).toBe('light')
    expect(toneOf('#ffffff')).toBe('light')
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
    const plain = { footer: '', numbers: false, logo: false }
    expect(deckSettings(null)).toEqual({ theme: 'site', transition: 'fade', autoplay: 0, ...plain })
    expect(deckSettings({ theme: 'brand', transition: 'slide', autoplay: '10' })).toEqual({ theme: 'brand', transition: 'slide', autoplay: 10, ...plain })
    expect(deckSettings({ theme: 'neon', transition: 'spin', autoplay: 7 })).toEqual({ theme: 'site', transition: 'fade', autoplay: 0, ...plain })
    const parsed = parsePresentation(form({ status: 'draft', settings: JSON.stringify({ theme: 'dark', autoplay: 30 }) }))
    expect(parsed).toMatchObject({ ok: true, data: { settings: { theme: 'dark', transition: 'fade', autoplay: 30 } } })
    expect(parsePresentation(form({ status: 'draft', settings: 'not json' }))).toMatchObject({ ok: true, data: { settings: { theme: 'site' } } })
  })

  it('keeps what goes on every slide: a short footer, and numbers and the logo only when asked', () => {
    expect(deckSettings({ footer: '  CSEG   ·  Fall kickoff ', numbers: true, logo: 'yes' })).toMatchObject({ footer: 'CSEG · Fall kickoff', numbers: true, logo: false })
    expect(deckSettings({ footer: 'x'.repeat(200) }).footer).toHaveLength(80)
    const settings = deckSettings({ footer: 'CSEG', numbers: true })
    expect(slideChrome(settings, 3, 'content')).toEqual({ footer: 'CSEG', number: 3, logo: undefined })
    // Not on a title slide, nor on a deck that wants nothing there
    expect(slideChrome(settings, 1, 'title')).toBeUndefined()
    expect(slideChrome(deckSettings({}), 2, 'content')).toBeUndefined()
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

  it('moves with the keys a presentation program uses, and goes to a slide by its number', () => {
    play()
    fireEvent.keyDown(window, { key: 'n' })
    expect(shown()).toBe('Slide 2 of 3: What we do')
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(shown()).toBe('Slide 3 of 3: Join us')
    fireEvent.keyDown(window, { key: 'Backspace' })
    fireEvent.keyDown(window, { key: 'P' })
    expect(shown()).toBe('Slide 1 of 3: Who we are')
    fireEvent.keyDown(window, { key: '3' })
    expect(shown()).toBe('Slide 1 of 3: Who we are')
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(shown()).toBe('Slide 3 of 3: Join us')
    // Enter on a button presses the button, and doesn't move on as well
    fireEvent.keyDown(window, { key: 'Home' })
    fireEvent.keyDown(screen.getByRole('button', { name: 'All slides' }), { key: 'Enter' })
    expect(shown()).toBe('Slide 1 of 3: Who we are')
  })

  it('blanks the screen white with W, and black with B', () => {
    render(<Deck slides={slides} bodies={[]} notes={['', '', '']} />)
    fireEvent.keyDown(window, { key: 'w' })
    expect(screen.getByRole('status')).toHaveTextContent('Screen white')
    fireEvent.keyDown(window, { key: 'b' })
    expect(screen.getByRole('status')).toHaveTextContent('Screen blanked')
    fireEvent.keyDown(window, { key: 'b' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('picks up the laser pointer and the pen, one at a time, and puts them down with Esc', () => {
    play()
    const laser = screen.getByRole('button', { name: 'Laser pointer (L)' })
    const pen = screen.getByRole('button', { name: 'Pen (D)' })
    fireEvent.keyDown(window, { key: 'l' })
    expect(laser).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(pen)
    expect(laser).toHaveAttribute('aria-pressed', 'false')
    expect(pen).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(pen).toHaveAttribute('aria-pressed', 'false')
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
    // Each one drawn small, as it looks
    expect(within(all).getByText('About What we do')).toBeInTheDocument()
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
    // The next slide, drawn small, and its title under it
    expect(within(panel).getAllByText('What we do')).toHaveLength(2)
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
    render(<Deck slides={slides} bodies={[]} settings={deckSettings({ theme: 'dark', transition: 'none', autoplay: 5 })} />)
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

  it('puts the deck’s footer, the logo, and the slide’s number along the bottom of a slide', () => {
    const settings = deckSettings({ footer: 'CSEG · Fall kickoff', numbers: true, logo: true })
    const { rerender } = render(<SlideThumb slide={{ id: 'a', title: 'Who we are' }} settings={settings} number={4} />)
    expect(screen.getByText('CSEG · Fall kickoff')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(document.querySelector('img[src*="logo"]')).not.toBeNull()
    rerender(<SlideThumb slide={{ id: 'a', title: 'Welcome', layout: 'title' }} settings={settings} number={1} />)
    expect(screen.queryByText('CSEG · Fall kickoff')).not.toBeInTheDocument()
  })

  it('draws two columns, a comparison’s headings, a quote, and a blank slide', () => {
    const { rerender } = render(
      <SlideView slide={{ id: 'a', title: 'Getting here', layout: 'comparison', label: 'Driving', label2: 'MARTA' }} second={<p>Five Points</p>}>
        <p>Decks fill early</p>
      </SlideView>
    )
    expect(screen.getByRole('heading', { name: 'Driving' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'MARTA' })).toBeInTheDocument()
    expect(screen.getByText('Five Points')).toBeInTheDocument()
    rerender(
      <SlideView slide={{ id: 'a', title: 'A member', layout: 'quote' }}>
        <p>CSEG is the reason I know where anything is.</p>
      </SlideView>
    )
    expect(screen.getByText('— A member')).toBeInTheDocument()
    expect(document.querySelector('blockquote')).toHaveTextContent('CSEG is the reason')
    rerender(
      <SlideView slide={{ id: 'a', title: 'Not shown', layout: 'blank' }}>
        <p>Just this</p>
      </SlideView>
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText('Just this')).toBeInTheDocument()
  })

  it('draws a slide on its own colour, with words that read on it', () => {
    const { container, rerender } = render(<SlideView slide={{ id: 'a', title: 'Dark', bgColor: '#0b2a6f' }} />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass('deck-theme-dark')
    expect(root.style.backgroundColor).toBe('rgb(11, 42, 111)')
    rerender(<SlideView slide={{ id: 'a', title: 'Light', bgColor: '#ffd166' }} />)
    expect(container.firstElementChild).toHaveClass('deck-theme-light')
  })

  it('puts the footer under the words on a phone, where the slide flows', () => {
    render(<SlideView slide={{ id: 'a', title: 'Who we are' }} chrome={{ footer: 'CSEG', number: 2 }} />)
    expect(screen.getByText('CSEG')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('stays on a slide its own time when playing by itself', () => {
    jest.useFakeTimers()
    const timed = [{ id: 'a', title: 'One', advance: 10 }, { id: 'b', title: 'Two' }, { id: 'c', title: 'Three' }]
    render(<Deck slides={timed} bodies={[]} settings={deckSettings({ autoplay: 5, transition: 'none' })} />)
    const now = () => screen.getByRole('group', { name: /^Slide \d of 3/ }).getAttribute('aria-label')
    fireEvent.click(screen.getByRole('button', { name: /^Play by itself/ }))
    act(() => void jest.advanceTimersByTime(6000))
    expect(now()).toBe('Slide 1 of 3: One')
    act(() => void jest.advanceTimersByTime(4000))
    expect(now()).toBe('Slide 2 of 3: Two')
    act(() => void jest.advanceTimersByTime(5000))
    expect(now()).toBe('Slide 3 of 3: Three')
    jest.useRealTimers()
  })

  it('shows a Play button for a deck whose only times are its slides’ own', () => {
    render(<Deck slides={[{ id: 'a', title: 'One', advance: 5 }, { id: 'b', title: 'Two' }]} bodies={[]} />)
    expect(screen.getByRole('button', { name: 'Play by itself, on each slide’s own time' })).toBeInTheDocument()
  })

  it('arrives as a slide says, whatever the deck does', () => {
    render(<Deck slides={[{ id: 'a', title: 'One' }, { id: 'b', title: 'Two', transition: 'slide' }]} bodies={[]} settings={deckSettings({ transition: 'fade' })} />)
    expect(screen.getByRole('group', { name: 'Slide 1 of 2: One' })).toHaveClass('deck-fade')
    expect(document.querySelector('[aria-label="Slide 2 of 2: Two"]')).toHaveClass('deck-next')
  })

  it('keeps what’s drawn with its slide, and through a reload', () => {
    window.localStorage.clear()
    const first = render(<Deck slides={slides} bodies={[]} />)
    fireEvent.keyDown(window, { key: 'd' })
    const ink = () => document.querySelector('svg[viewBox="0 0 1100 620"]')
    fireEvent.pointerDown(ink()!, { clientX: 5, clientY: 5, pointerId: 1 })
    fireEvent.pointerMove(ink()!, { clientX: 9, clientY: 9, pointerId: 1 })
    fireEvent.pointerUp(ink()!, { pointerId: 1 })
    expect(ink()!.querySelector('polyline')).not.toBeNull()
    // On another slide there's nothing drawn
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(ink()).toBeNull()
    // The page reloads, and the drawing is back on its slide
    first.unmount()
    window.history.replaceState(null, '', '/presentations/welcome')
    render(<Deck slides={slides} bodies={[]} />)
    expect(ink()?.querySelector('polyline')).not.toBeNull()
    // Shift+E rubs out every slide's
    fireEvent.keyDown(window, { key: 'E', shiftKey: true })
    expect(ink()).toBeNull()
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

  it('brings a slide’s points in one at a time, when it’s set to, and takes them back out going back', () => {
    const stepped = [
      { id: 'a', title: 'Who we are', reveal: true },
      { id: 'b', title: 'Join us' },
    ]
    render(
      <Deck
        slides={stepped}
        bodies={[
          <ul key="a">
            <li>Commuters</li>
            <li>
              Officers
              <ul>
                <li>From every college</li>
              </ul>
            </li>
          </ul>,
          <ul key="b">
            <li>Every other Thursday</li>
          </ul>,
        ]}
      />
    )
    const point = (text: string) => screen.getByText(text).closest('li')!
    const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next slide' }))
    const previous = () => fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }))
    expect(point('Commuters')).toHaveClass('deck-step-hidden')
    expect(point('Officers')).toHaveClass('deck-step-hidden')
    const shownOf2 = () => screen.getByRole('group', { name: /^Slide \d of 2/ }).getAttribute('aria-label')
    next()
    expect(shownOf2()).toBe('Slide 1 of 2: Who we are')
    expect(point('Commuters')).not.toHaveClass('deck-step-hidden')
    expect(point('Officers')).toHaveClass('deck-step-hidden')
    next()
    // A point's own sub-points come with it
    expect(point('Officers')).not.toHaveClass('deck-step-hidden')
    expect(point('From every college')).not.toHaveClass('deck-step-hidden')
    next()
    expect(shownOf2()).toBe('Slide 2 of 2: Join us')
    // A slide that isn't set to shows its points all at once
    expect(point('Every other Thursday')).not.toHaveClass('deck-step-hidden')
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled()
    previous()
    expect(shownOf2()).toBe('Slide 1 of 2: Who we are')
    expect(point('Officers')).not.toHaveClass('deck-step-hidden')
    previous()
    expect(point('Officers')).toHaveClass('deck-step-hidden')
    expect(point('Commuters')).not.toHaveClass('deck-step-hidden')
  })

  describe('with an audience window', () => {
    /** BroadcastChannel, between the windows of one test */
    class Channel {
      static open = new Set<Channel>()
      onmessage: ((e: { data: unknown }) => void) | null = null
      constructor(public name: string) {
        Channel.open.add(this)
      }
      postMessage(data: unknown) {
        for (const other of Channel.open) if (other !== this && other.name === this.name) other.onmessage?.({ data: JSON.parse(JSON.stringify(data)) })
      }
      close() {
        Channel.open.delete(this)
      }
    }
    const real = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel
    beforeEach(() => Object.assign(globalThis, { BroadcastChannel: Channel }))
    afterEach(() => Object.assign(globalThis, { BroadcastChannel: real }))

    const bodies = slides.map((s) => <p key={s.id}>About {s.title}</p>)
    const slideIn = (deck: HTMLElement) => within(deck).getAllByRole('group', { hidden: true }).find((g) => !g.hidden)?.getAttribute('aria-label')

    it('keeps the projector on the presenter’s slide, and the presenter on the projector’s', () => {
      render(
        <>
          <Deck slides={slides} bodies={bodies} notes={['', '', '']} sync="deck-1" audienceHref="/present/1" />
          <Deck slides={slides} bodies={bodies} mode="audience" sync="deck-1" />
        </>
      )
      const [presenter, room] = screen.getAllByRole('region', { name: 'Slides' })
      expect(screen.getByText(/The audience window follows this one/)).toBeInTheDocument()
      fireEvent.click(within(presenter).getByRole('button', { name: 'Next slide' }))
      expect(slideIn(room)).toBe('Slide 2 of 3: What we do')
      // On the projector a click on the slide moves on, and the presenter follows
      fireEvent.click(within(room).getByText('About What we do'))
      expect(slideIn(room)).toBe('Slide 3 of 3: Join us')
      expect(slideIn(presenter)).toBe('Slide 3 of 3: Join us')
    })

    it('shows the room only the slides: no notes, no controls', () => {
      render(<Deck slides={slides} bodies={bodies} mode="audience" sync="deck-2" />)
      expect(screen.queryByRole('complementary', { name: 'Speaker notes' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Next slide' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Full screen' })).toBeInTheDocument()
    })

    it('shows the room what the presenter draws', () => {
      render(
        <>
          <Deck slides={slides} bodies={bodies} notes={['', '', '']} sync="deck-4" />
          <Deck slides={slides} bodies={bodies} mode="audience" sync="deck-4" />
        </>
      )
      const [presenter, room] = screen.getAllByRole('region', { name: 'Slides' })
      fireEvent.click(within(presenter).getByRole('button', { name: 'Pen (D)' }))
      const ink = presenter.querySelector('svg[viewBox="0 0 1100 620"]')!
      fireEvent.pointerDown(ink, { clientX: 10, clientY: 10, pointerId: 1 })
      fireEvent.pointerMove(ink, { clientX: 20, clientY: 20, pointerId: 1 })
      fireEvent.pointerUp(ink, { pointerId: 1 })
      expect(room.querySelector('svg[viewBox="0 0 1100 620"] polyline')).not.toBeNull()
      fireEvent.keyDown(window, { key: 'e' })
      expect(room.querySelector('svg[viewBox="0 0 1100 620"] polyline')).toBeNull()
    })

    it('blanks the room’s screen from the presenter’s', () => {
      render(
        <>
          <Deck slides={slides} bodies={bodies} notes={['', '', '']} sync="deck-3" />
          <Deck slides={slides} bodies={bodies} mode="audience" sync="deck-3" />
        </>
      )
      fireEvent.keyDown(window, { key: 'b' })
      expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Screen blanked')
      expect(screen.getByRole('button', { name: 'Show the slides again' })).toBeInTheDocument()
    })
  })

  it('says so when there are no slides', () => {
    render(<Deck slides={[]} bodies={[]} />)
    expect(screen.getByText('This presentation has no slides yet.')).toBeInTheDocument()
  })
})
