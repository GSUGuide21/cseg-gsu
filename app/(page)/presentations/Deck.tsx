'use client'

/* eslint-disable @next/next/no-img-element -- slide pictures can be from any site, at any size */
import { ChevronLeft, ChevronRight, Crosshair, Eraser, LayoutGrid, Maximize, Minimize, MonitorUp, Pause, PenLine, Play, RotateCcw } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type FC, type ReactNode } from 'react'

import { LogoMark } from '@/globals/Logo'
import { cn } from '@/lib/cn'
import { DEFAULT_DECK_SETTINGS, isHexColor, slideChrome, themeClass, toneOf, type DeckSlide, type SlideChrome } from '@/lib/presentations'
import { safeSrc } from '@/lib/safeUrl'
import type { PresentationSettings } from '@/lib/supabase/types'

import { InkLayer, type InkTool, type Point, type Stroke } from './Ink'

const control =
  'grid size-9 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-brand-tint aria-pressed:text-brand [&>svg]:size-5'

/**
 * The size every slide is laid out at, as a presentation program's page is: whatever the
 * screen, a slide is drawn at this size and scaled to fit, so it looks the same in the editor,
 * in the page, full screen on a projector, and on paper.
 */
export const STAGE = { width: 1100, height: 620 }
/** Narrower than this (a phone), a deck on the site flows instead, at a size that can be read */
const FLOW_BELOW = 560
/** The least a slide's words are shrunk to fit it; past that they run off the bottom */
const FIT_MIN = 0.5
/** How far a finger has to travel sideways to turn the slide */
const SWIPE = 50
/** A step past the last point on any slide: the slide with all of its points showing */
const ALL = 1_000_000

/** How long, after a digit, the show waits for Enter to go to that slide */
const JUMP_MS = 2000

const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
/** On something Enter already does something with: a button or a link */
const onControl = (target: EventTarget | null) => target instanceof Element && !!target.closest('button, a, [role="button"], summary')

export type { DeckSlide }

/**
 * The points a slide shows one at a time: the items of its lists. A point's own sub-points
 * come with it.
 */
export const slidePoints = (root: Element) =>
  Array.from(root.querySelectorAll('li')).filter((li) => {
    const parent = li.parentElement?.closest('li')
    return !parent || !root.contains(parent)
  })

/** Whether the slides here are drawn at the stage's size and scaled ('fixed'), or flow at the page's ('flow') */
const StageMode = createContext<'fixed' | 'flow'>('flow')

/**
 * A slide's frame: STAGE-sized, scaled to fit the box it's in, centered. `narrowFlow` lets
 * it give that up on a phone, where a whole slide scaled down would be too small to read.
 * `children` are drawn on the slide; `overlay`, over the box, at the screen's own size.
 */
export const Stage: FC<{ children: ReactNode; overlay?: ReactNode; className?: string; fill?: boolean; narrowFlow?: boolean }> = ({ children, overlay, className, fill = false, narrowFlow = false }) => {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize((was) => (was && was.w === el.clientWidth && was.h === el.clientHeight ? was : { w: el.clientWidth, h: el.clientHeight }))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => watch.disconnect()
  }, [])
  const flow = narrowFlow && size !== null && size.w < FLOW_BELOW
  const scale = size ? Math.min(size.w / STAGE.width, size.h / STAGE.height) : 1
  return (
    <div ref={box} className={cn('relative overflow-hidden', fill ? 'size-full' : flow ? 'aspect-[4/5]' : 'aspect-[1100/620]', className)}>
      <StageMode.Provider value={flow ? 'flow' : 'fixed'}>
        {flow ? (
          <div className="absolute inset-0">{children}</div>
        ) : (
          <div
            className={cn('absolute top-1/2 left-1/2', !size && 'invisible')}
            style={{ width: STAGE.width, height: STAGE.height, transform: `translate(-50%, -50%) scale(${scale})` }}
          >
            {children}
          </div>
        )}
      </StageMode.Provider>
      {overlay}
    </div>
  )
}

/**
 * A slide's words, shrunk to fit it when there are too many: as a presentation program's
 * "shrink text on overflow". They're laid out wider, by as much as they'll be shrunk, so they
 * fill the slide's width once they are. Says how far (1: not at all) to `onFit`.
 */
const Fit: FC<{ children: ReactNode; className?: string; end?: boolean; onFit?: (fit: number, overflows: boolean) => void }> = ({ children, className, end, onFit }) => {
  const fixed = useContext(StageMode) === 'fixed'
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const report = useRef(onFit)
  useEffect(() => {
    report.current = onFit
  })
  useLayoutEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    if (!fixed) {
      i.style.width = i.style.minHeight = i.style.transform = ''
      return
    }
    let last = ''
    const fit = () => {
      i.style.width = '100%'
      i.style.minHeight = '100%'
      i.style.transform = ''
      const room = o.clientHeight
      const need = i.offsetHeight
      // Laid out wider it's no taller, so shrinking by room / need always fits
      const by = room && need > room + 1 ? Math.max(FIT_MIN, room / need) : 1
      i.style.width = `${100 / by}%`
      i.style.minHeight = `${100 / by}%`
      i.style.transform = by < 1 ? `scale(${by})` : ''
      const said = `${by}:${need * by > room + 1}`
      if (said !== last) {
        last = said
        report.current?.(by, need * by > room + 1)
      }
    }
    fit()
    if (typeof ResizeObserver === 'undefined') return
    const watch = new ResizeObserver(fit)
    watch.observe(i)
    return () => watch.disconnect()
  }, [fixed])
  const justify = end ? 'justify-end' : 'justify-center'
  // The same two boxes either way (flowing, the inner one has none of its own), so switching
  // between the two doesn't start the slide's writing over
  return (
    <div ref={outer} className={fixed ? 'absolute inset-0 overflow-hidden' : cn('relative flex flex-1 flex-col', justify, className)}>
      <div ref={inner} className={fixed ? cn('flex origin-top-left flex-col', justify, className) : 'contents'}>
        {children}
      </div>
    </div>
  )
}

const titleSize = 'm-0 leading-tight font-extrabold tracking-tight text-balance text-ink'

/** What a slide's drawn with besides its settings: its writing, its second column's, and what's along its bottom */
type SlideViewProps = { slide: DeckSlide; children?: ReactNode; second?: ReactNode; chrome?: SlideChrome; onFit?: (fit: number, overflows: boolean) => void }

/**
 * One slide, laid out: its title and its writing (`children`, and `second` for a second
 * column, drawn by the page), arranged as its layout says, on its own background if it has
 * one, with the deck's footer along the bottom. The player, the editor, and the page that
 * prints a deck all draw slides with this. In a Stage it's drawn at the stage's size, its
 * words shrunk if they'd overflow (`onFit` hears by how much); outside one, it flows, with the
 * footer under the words.
 */
export const SlideView: FC<SlideViewProps> = ({ slide, chrome, ...rest }) => {
  const fixed = useContext(StageMode) === 'fixed'
  const picture = slide.layout === 'image-full' ? null : slide.bgImage ? safeSrc(slide.bgImage) : null
  const colour = !picture && slide.layout !== 'image-full' && isHexColor(slide.bgColor) ? slide.bgColor : null
  // Words on a picture are light, on a colour whichever reads better, else the deck's own
  const tone = slide.layout === 'image-full' || picture ? 'dark' : colour ? toneOf(colour) : null
  return (
    <div className={cn('flex flex-col', fixed ? 'absolute inset-0' : 'relative min-h-full', tone && `deck-theme deck-theme-${tone}`)} style={colour ? { backgroundColor: colour } : undefined}>
      {picture ? (
        <>
          <img src={picture} alt="" className="absolute inset-0 size-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-black/55" />
        </>
      ) : null}
      <SlideLayoutView slide={slide} fixed={fixed} roomForChrome={fixed && !!chrome} {...rest} />
      {chrome ? <ChromeBar chrome={chrome} fixed={fixed} /> : null}
    </div>
  )
}

/** The deck's footer, the logo, and the slide's number: along the bottom of a slide, or under its words when it flows */
const ChromeBar: FC<{ chrome: SlideChrome; fixed: boolean }> = ({ chrome, fixed }) => (
  <div className={cn('pointer-events-none flex items-center text-muted', fixed ? 'absolute inset-x-0 bottom-0 gap-4 px-10 pb-5 text-[0.95rem]' : 'relative gap-3 px-[clamp(1.25rem,4vw,3rem)] pb-4 text-[0.8rem]')}>
    {chrome.logo ? <LogoMark size={fixed ? 34 : 24} /> : null}
    <span className="min-w-0 flex-1 truncate">{chrome.footer}</span>
    {chrome.number ? <span className="font-semibold text-ink-soft tabular-nums">{chrome.number}</span> : null}
  </div>
)

const SlideLayoutView: FC<Omit<SlideViewProps, 'chrome'> & { fixed: boolean; roomForChrome: boolean }> = ({ slide, fixed, roomForChrome, children, second, onFit }) => {
  const layout = slide.layout ?? 'content'
  const src = slide.image ? safeSrc(slide.image) : null
  const at = (fixedSize: string, flowSize: string) => (fixed ? fixedSize : flowSize)
  const content = cn('mx-auto flex w-full max-w-4xl flex-col gap-4', at(roomForChrome ? 'px-16 pt-12 pb-20' : 'px-16 py-12', 'p-[clamp(1.25rem,4vw,3rem)]'))
  const heading = slide.title ? <h2 className={cn(titleSize, at('text-[2.6rem]', 'text-[clamp(1.5rem,3.5vw,2.4rem)]'))}>{slide.title}</h2> : null
  const textSize = at('text-[1.35rem]', 'text-[clamp(1rem,1.6vw,1.2rem)]')
  const writing = (extra?: string) => (children ? <div className={cn(textSize, extra)}>{children}</div> : null)
  const columns = cn('grid gap-10', fixed ? 'grid-cols-2' : 'gap-[clamp(1rem,3vw,2.5rem)] sm:grid-cols-2')

  if (layout === 'title')
    return (
      <Fit onFit={onFit}>
        <div className={cn(content, 'items-center text-center')}>
          {slide.title ? <h2 className={cn(titleSize, at('text-[4rem]', 'text-[clamp(2rem,5.5vw,3.6rem)]'))}>{slide.title}</h2> : null}
          {writing('max-w-2xl text-muted')}
        </div>
      </Fit>
    )

  if (layout === 'section')
    return (
      <Fit onFit={onFit}>
        <div className={content}>
          <span aria-hidden className="h-1.5 w-20 rounded-full bg-brand" />
          {slide.title ? <h2 className={cn(titleSize, at('text-[3.4rem]', 'text-[clamp(1.9rem,5vw,3.2rem)]'))}>{slide.title}</h2> : null}
          {writing('text-muted')}
        </div>
      </Fit>
    )

  if (layout === 'image-full')
    return (
      // Words over a picture: drawn light on a darkened picture, whatever the deck's theme
      <div className={cn('relative flex flex-1 flex-col bg-surface', fixed && 'h-full')}>
        {src ? <img src={src} alt="" className="absolute inset-0 size-full object-cover" /> : null}
        <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/85 via-black/45 to-black/20" />
        {/* The words sit along the bottom, where the picture is darkest */}
        <Fit onFit={onFit} end>
          <div className={content}>
            {heading}
            {writing()}
          </div>
        </Fit>
      </div>
    )

  if (layout === 'image-left' || layout === 'image-right')
    return (
      <Fit onFit={onFit}>
        <div className={cn(content, 'max-w-5xl')}>
          <div className={cn(columns, 'items-center')}>
            <div className={cn('flex min-w-0 flex-col gap-4', layout === 'image-left' && (fixed ? 'order-2' : 'sm:order-2'))}>
              {heading}
              {writing()}
            </div>
            {src ? (
              <img src={src} alt="" className="aspect-[4/3] w-full rounded-xl object-cover shadow-card" />
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-line bg-fill text-[0.85rem] text-muted">No picture yet</div>
            )}
          </div>
        </div>
      </Fit>
    )

  if (layout === 'two-column' || layout === 'comparison') {
    const column = (label: string | undefined, body: ReactNode) => (
      <div className="flex min-w-0 flex-col gap-3">
        {layout === 'comparison' ? (
          <h3 className={cn('m-0 border-b-2 border-brand pb-2 leading-tight font-bold text-ink', at('text-[1.7rem]', 'text-[clamp(1.15rem,2.4vw,1.5rem)]'))}>{label || '\u00a0'}</h3>
        ) : null}
        {body ? <div className={textSize}>{body}</div> : null}
      </div>
    )
    return (
      <Fit onFit={onFit}>
        <div className={cn(content, 'max-w-5xl')}>
          {heading}
          <div className={columns}>
            {column(slide.label, children)}
            {column(slide.label2, second)}
          </div>
        </div>
      </Fit>
    )
  }

  if (layout === 'quote')
    return (
      <Fit onFit={onFit}>
        <figure className={cn(content, 'm-0 items-center text-center')}>
          <span aria-hidden className={cn('-mb-4 leading-none font-extrabold text-brand', at('text-[7rem]', 'text-[clamp(3.5rem,9vw,6rem)]'))}>
            {'\u201c'}
          </span>
          {children ? <blockquote className={cn('m-0 max-w-3xl leading-snug font-semibold text-balance text-ink italic', at('text-[2.2rem]', 'text-[clamp(1.3rem,3.2vw,2rem)]'), '[&_blockquote]:m-0 [&_blockquote]:border-0 [&_blockquote]:p-0')}>{children}</blockquote> : null}
          {slide.title ? <figcaption className={cn('text-muted', at('text-[1.3rem]', 'text-[clamp(1rem,1.8vw,1.2rem)]'))}>— {slide.title}</figcaption> : null}
        </figure>
      </Fit>
    )

  if (layout === 'blank')
    return (
      <Fit onFit={onFit}>
        <div className={content}>{writing()}</div>
      </Fit>
    )

  return (
    <Fit onFit={onFit}>
      <div className={content}>
        {heading}
        {writing()}
      </div>
    </Fit>
  )
}

/**
 * A slide, small: drawn at its own size and scaled down, in the deck's theme and with its
 * footer (it's slide `number` in the show), for the slides down the editor's side, every
 * slide at a glance, and what's next. Nothing in it can be clicked or tabbed to.
 */
export const SlideThumb: FC<{ slide: DeckSlide; children?: ReactNode; second?: ReactNode; settings: PresentationSettings; number: number; className?: string }> = ({ slide, children, second, settings, number, className }) => (
  <div aria-hidden inert className={cn('overflow-hidden rounded-md border border-line bg-surface text-ink', themeClass(settings.theme), className)}>
    <Stage>
      <SlideView slide={slide} second={second} chrome={slideChrome(settings, number, slide.layout)}>
        {children}
      </SlideView>
    </Stage>
  </div>
)

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** Where a show is: which slide, how many of its points are showing, and which way it last went */
type Position = { index: number; step: number; back: boolean }

/** What the room sees instead of the slide: nothing (the slide), a black screen, or a white one */
type Screen = 'black' | 'white' | null

/** What two windows showing one deck (the presenter's and the audience's) tell each other */
type Message = { role: DeckMode } & (
  | { type: 'hello' }
  | { type: 'bye' }
  | { type: 'position'; index: number; step: number; back: boolean }
  | { type: 'screen'; screen: Screen }
  | { type: 'laser'; at: Point | null }
  | { type: 'ink'; id: string; strokes: Stroke[] }
)

/** A spot sent from the other window, if it is one */
const isPoint = (p: unknown): p is Point => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n))
/** Lines sent from the other window, or kept in this browser: only what's a line */
const cleanStrokes = (raw: unknown): Stroke[] => (Array.isArray(raw) ? raw.filter(Array.isArray).map((st: unknown[]) => st.filter(isPoint)).filter((st) => st.length) : [])

/** Where this browser keeps what's drawn on a deck's slides, so a reload doesn't lose it */
const inkKey = (deck: string) => `deck-ink:${deck}`
const readInk = (deck: string): Record<string, Stroke[]> => {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(inkKey(deck)) ?? '{}')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    return Object.fromEntries(Object.entries(raw).map(([id, strokes]) => [id, cleanStrokes(strokes)]).filter(([, strokes]) => strokes.length))
  } catch {
    return {}
  }
}
const keepInk = (deck: string, ink: Record<string, Stroke[]>) => {
  try {
    const drawn = Object.fromEntries(Object.entries(ink).filter(([, strokes]) => strokes.length))
    if (Object.keys(drawn).length) window.localStorage.setItem(inkKey(deck), JSON.stringify(drawn))
    else window.localStorage.removeItem(inkKey(deck))
  } catch {
    // Private windows and full storage: it's kept only while the page is open
  }
}

/** Where a deck plays: in a page ('page'), for whoever presents it ('presenter'), or as the room sees it ('audience') */
export type DeckMode = 'page' | 'presenter' | 'audience'

interface DeckProps {
  slides: readonly DeckSlide[]
  bodies: readonly ReactNode[]
  /** Each slide's second column, for the layouts with two */
  seconds?: readonly ReactNode[]
  /** Each slide's speaker notes, for whoever presents it; given, the deck plays in presenter mode */
  notes?: readonly string[]
  settings?: PresentationSettings
  /** 'audience': the slides alone, filling the window, for the projector */
  mode?: 'audience'
  /** A name the presenter's and audience's windows share, to keep them on the same slide */
  sync?: string
  /** The audience window's address, for presenter mode's button that opens it */
  audienceHref?: string
}

/**
 * Plays a slide deck: one slide at a time in a 16:9 frame, in the deck's theme, each slide
 * arriving by the deck's transition. Under it: Previous and Next, the slide number, how far
 * through it is, every slide at a glance (to jump to one), and a full-screen button; and, for
 * a deck set to play by itself, a Play button that turns the slides on a timer, round and round.
 *
 * A slide set to show its points one at a time starts with its lists empty, and each Next
 * brings in the next point before moving on; going back takes them away again.
 *
 * Keys, as in a presentation program: Right, Down, Page Down, N, and Enter move on, and Left,
 * Up, Page Up, P, and Backspace go back (Space and Up/Down only full screen, where the page
 * doesn't scroll), as does a swipe; full screen, a click moves on too. Home and End go to the
 * first and last slide, and a slide's number then Enter goes to it. F goes full screen, G
 * shows all the slides, B blanks the screen black and W white. L is a laser pointer and D a
 * pen to draw on the slide with (E rubs out what's drawn on it; Esc puts either down). The
 * address keeps the slide's number (#3), so a link can open on a slide.
 *
 * Along the bottom of each slide (but a title slide), the deck's footer, the logo, and the
 * slide's number, as the deck's settings say. A slide can arrive its own way, and stay up its
 * own time when the deck plays by itself. What's drawn on a slide stays with that slide, and
 * in this browser through a reload, until it's rubbed out (E for the slide, Shift+E for all).
 *
 * Each slide's writing is drawn by the page and handed in (`bodies`, in the slides' order);
 * this only decides which one shows. With `notes`, it's the presenter's view: a panel under
 * the frame has the slide's speaker notes, the next slide, and a clock, and a button opens the
 * audience's window (`audienceHref`) to drag onto the projector. The two stay on the same
 * slide (`sync`), whichever one is moved, and the room sees the presenter's pointer, pen, and
 * blanked screen.
 */
export const Deck: FC<DeckProps> = ({ slides, bodies, seconds = [], notes, settings = DEFAULT_DECK_SETTINGS, mode: given, sync, audienceHref }) => {
  const mode: DeckMode = given ?? (notes !== undefined ? 'presenter' : 'page')
  const audience = mode === 'audience'
  const count = slides.length
  const [position, setPosition] = useState<Position>({ index: 0, step: 0, back: false })
  const { index, back } = position
  // How many points the slide showing has to bring in one at a time, and how many are in
  const [points, setPoints] = useState(0)
  const step = Math.min(position.step, points)
  const [fullscreen, setFullscreen] = useState(false)
  const [overview, setOverview] = useState(false)
  const [screen, setScreen] = useState<Screen>(null)
  // The presenter's pointer and pen: which is in hand, where the dot is, and what's drawn on each slide
  const [tool, setTool] = useState<InkTool>(null)
  const [laser, setLaser] = useState<Point | null>(null)
  // What's drawn, by slide id, so it stays with its slide
  const [ink, setInk] = useState<Record<string, Stroke[]>>({})
  // A slide's number, typed, waiting for Enter
  const jump = useRef({ digits: '', at: 0 })
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [now, setNow] = useState<Date | null>(null)
  // Presenting: whether the audience's window is open
  const [audienceOpen, setAudienceOpen] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const sections = useRef<(HTMLElement | null)[]>([])
  const touch = useRef<{ x: number; y: number } | null>(null)
  const channel = useRef<BroadcastChannel | null>(null)
  const audienceWindow = useRef<Window | null>(null)
  const here = useRef({ position, points, step, screen, ink })
  useEffect(() => {
    here.current = { position, points, step, screen, ink }
  })

  const tell = useCallback((message: Message) => channel.current?.postMessage(message), [])
  const moveTo = useCallback(
    (to: Position) => {
      setPosition(to)
      tell({ type: 'position', role: mode, ...to })
    },
    [mode, tell]
  )
  /** Blanks the room's screen that colour, or brings the slide back if it already is */
  const blankOut = useCallback(
    (colour: Screen) => {
      const next = colour === here.current.screen ? null : colour
      setScreen(next)
      tell({ type: 'screen', role: mode, screen: next })
    },
    [mode, tell]
  )
  const point = useCallback(
    (to: Point | null) => {
      setLaser(to)
      tell({ type: 'laser', role: mode, at: to })
    },
    [mode, tell]
  )
  const draw = useCallback(
    (on: string, strokes: Stroke[]) => {
      setInk((all) => ({ ...all, [on]: strokes }))
      tell({ type: 'ink', role: mode, id: on, strokes })
    },
    [mode, tell]
  )
  const rubOutAll = useCallback(() => {
    for (const id of Object.keys(here.current.ink)) draw(id, [])
  }, [draw])

  // What was drawn before a reload comes back; what's drawn is kept, a moment after each line
  const inkDeck = sync ?? (typeof window === 'undefined' ? '' : window.location.pathname)
  const inkLoaded = useRef(false)
  useEffect(() => {
    if (!inkDeck) return
    const kept = readInk(inkDeck)
    if (Object.keys(kept).length) setInk((now) => ({ ...kept, ...now }))
    inkLoaded.current = true
  }, [inkDeck])
  useEffect(() => {
    if (!inkDeck || !inkLoaded.current) return
    const timer = window.setTimeout(() => keepInk(inkDeck, ink), 300)
    return () => window.clearTimeout(timer)
  }, [inkDeck, ink])
  // And right away when the page goes, so the last line isn't lost to a quick reload
  useEffect(() => {
    if (!inkDeck) return
    const flush = () => {
      if (inkLoaded.current) keepInk(inkDeck, here.current.ink)
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [inkDeck])
  /** Picks up the laser pointer or the pen, or puts it down if it's the one in hand */
  const pickUp = useCallback(
    (which: Exclude<InkTool, null>) => {
      if (tool === 'laser') point(null)
      setTool(tool === which ? null : which)
    },
    [point, tool]
  )

  /** Straight to a slide, none of its points in yet */
  const go = useCallback(
    (to: number) => {
      const from = here.current.position.index
      const next = Math.min(Math.max(to, 0), count - 1)
      if (next !== from) moveTo({ index: next, step: 0, back: next < from })
    },
    [count, moveTo]
  )
  /** The next point, or the next slide; with `round`, from the last back to the first */
  const forward = useCallback(
    (round = false) => {
      const { position: at, points: n, step: s } = here.current
      if (s < n) moveTo({ index: at.index, step: s + 1, back: false })
      else if (at.index < count - 1) moveTo({ index: at.index + 1, step: 0, back: false })
      else if (round && count > 1) moveTo({ index: 0, step: 0, back: false })
    },
    [count, moveTo]
  )
  /** The last point back out, or the slide before, with all of its points in */
  const backward = useCallback(() => {
    const { position: at, step: s } = here.current
    if (s > 0) moveTo({ index: at.index, step: s - 1, back: true })
    else if (at.index > 0) moveTo({ index: at.index - 1, step: ALL, back: true })
  }, [moveTo])

  // The slide's points: the ones not in yet are kept in their place, unseen; the one just in arrives
  useLayoutEffect(() => {
    sections.current.forEach((section, i) => {
      if (!section) return
      const list = slidePoints(section)
      const stepping = i === index && !!slides[i]?.reveal
      if (i === index) setPoints(stepping ? list.length : 0)
      const showing = Math.min(position.step, list.length)
      list.forEach((li, n) => {
        li.classList.toggle('deck-step-hidden', stepping && n >= showing)
        li.classList.toggle('deck-step-in', stepping && !back && n === showing - 1)
      })
    })
  }, [index, position.step, back, slides, bodies])

  // Two windows on one deck: each says where it's gone, and the other follows
  useEffect(() => {
    if (!sync || typeof BroadcastChannel === 'undefined') return
    const ch = new BroadcastChannel(sync)
    channel.current = ch
    ch.onmessage = ({ data }: MessageEvent<Message>) => {
      if (!data || typeof data !== 'object' || data.role === mode) return
      if (data.role === 'audience') setAudienceOpen(data.type !== 'bye')
      if (data.type === 'hello') {
        // Someone new: where this one is, what the room's screen is, and what's drawn
        ch.postMessage({ type: 'position', role: mode, ...here.current.position } satisfies Message)
        ch.postMessage({ type: 'screen', role: mode, screen: here.current.screen } satisfies Message)
        for (const [id, strokes] of Object.entries(here.current.ink)) ch.postMessage({ type: 'ink', role: mode, id, strokes } satisfies Message)
      } else if (data.type === 'position' && Number.isInteger(data.index) && data.index >= 0 && data.index < count) setPosition({ index: data.index, step: Math.max(0, Number(data.step) || 0), back: !!data.back })
      else if (data.type === 'screen') setScreen(data.screen === 'black' || data.screen === 'white' ? data.screen : null)
      else if (data.type === 'laser') setLaser(isPoint(data.at) ? data.at : null)
      else if (data.type === 'ink' && typeof data.id === 'string') setInk((all) => ({ ...all, [data.id]: cleanStrokes(data.strokes) }))
    }
    ch.postMessage({ type: 'hello', role: mode } satisfies Message)
    const bye = () => ch.postMessage({ type: 'bye', role: mode } satisfies Message)
    window.addEventListener('pagehide', bye)
    return () => {
      window.removeEventListener('pagehide', bye)
      bye()
      ch.close()
      channel.current = null
    }
  }, [sync, mode, count])

  // A link to a slide (#3) opens on it; moving keeps the address in step, without adding history
  const opened = useRef(false)
  useEffect(() => {
    if (!opened.current) {
      opened.current = true
      const n = Number(window.location.hash.slice(1))
      if (Number.isInteger(n) && n >= 1 && n <= count) setPosition({ index: n - 1, step: 0, back: false })
      return
    }
    window.history.replaceState(null, '', index ? `#${index + 1}` : window.location.pathname + window.location.search)
  }, [index, count])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else stage.current?.requestFullscreen?.()?.catch(() => {})
  }, [])

  useEffect(() => {
    const change = () => {
      const on = !!stage.current && document.fullscreenElement === stage.current
      setFullscreen(on)
      if (!on && !audience) setScreen(null)
    }
    document.addEventListener('fullscreenchange', change)
    return () => document.removeEventListener('fullscreenchange', change)
  }, [audience])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return
      const full = document.fullscreenElement === stage.current || audience
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      // A slide's number, then Enter, goes to it
      if (/^[0-9]$/.test(key)) {
        const typed = Date.now() - jump.current.at < JUMP_MS ? jump.current.digits : ''
        jump.current = { digits: (typed + key).slice(-3), at: Date.now() }
        e.preventDefault()
        return
      }
      const typed = Date.now() - jump.current.at < JUMP_MS ? jump.current.digits : ''
      jump.current = { digits: '', at: 0 }
      if (key === 'Enter' && typed) {
        go(Number(typed) - 1)
        e.preventDefault()
        return
      }
      const next = key === 'ArrowRight' || key === 'PageDown' || key === 'n' || (key === 'Enter' && !onControl(e.target)) || (full && ((key === ' ' && !e.shiftKey) || key === 'ArrowDown'))
      const previous = key === 'ArrowLeft' || key === 'PageUp' || key === 'p' || key === 'Backspace' || (full && ((key === ' ' && e.shiftKey) || key === 'ArrowUp'))
      if (next) forward()
      else if (previous) backward()
      else if (key === 'Home') go(0)
      else if (key === 'End') go(count - 1)
      else if (key === 'f') toggleFullscreen()
      else if (key === 'g' && !audience) setOverview((o) => !o)
      else if (key === 'b' || key === '.') blankOut('black')
      else if (key === 'w' || key === ',') blankOut('white')
      else if (key === 'l') pickUp('laser')
      else if (key === 'd') pickUp('pen')
      else if (key === 'e' && e.shiftKey) rubOutAll()
      else if (key === 'e') draw(slides[here.current.position.index].id, [])
      else if (key === 'Escape' && tool) pickUp(tool)
      else if (key === 'Escape' && !full) setOverview(false)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, go, forward, backward, toggleFullscreen, blankOut, audience, pickUp, draw, rubOutAll, tool, slides])

  // Playing by itself: each slide (or point) stays up for the deck's time, then the next, and
  // round again. Moving by hand starts its time over.
  // A slide's own time, if it has one, else the deck's
  const autoplay = settings.autoplay
  const timed = !!autoplay || slides.some((s) => s.advance)
  const stay = slides[index]?.advance ?? autoplay
  useEffect(() => {
    if (!playing || !stay || overview || count < 2) return
    const timer = window.setTimeout(() => forward(true), stay * 1000)
    return () => window.clearTimeout(timer)
  }, [playing, stay, overview, count, position, forward])

  // The presenter's clocks: how long it's been, and the time of day
  const presenting = mode === 'presenter'
  useEffect(() => {
    if (!presenting) return
    const timer = window.setInterval(() => {
      setElapsed((s) => s + 1)
      setNow(new Date())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [presenting])

  if (!count) return <p className="m-0 text-muted">This presentation has no slides yet.</p>

  // How a slide arrives: its own way, else the deck's
  const arrive = (s: DeckSlide) => {
    const how = s.transition ?? settings.transition
    return how === 'fade' ? 'deck-fade' : how === 'slide' ? (back ? 'deck-prev' : 'deck-next') : undefined
  }
  const atStart = index === 0 && step === 0
  const atEnd = index === count - 1 && step >= points
  const big = fullscreen || audience

  // Open already, it's brought to the front, not loaded again (which would take it out of full screen)
  const openAudience = () => {
    if (!audienceHref) return
    if (audienceWindow.current && !audienceWindow.current.closed) return audienceWindow.current.focus()
    audienceWindow.current = window.open(audienceHref, sync ? `deck-audience-${sync}` : '_blank', `popup,width=${STAGE.width},height=${STAGE.height + 40}`)
  }

  return (
    <>
      <div
        ref={stage}
        role="region"
        aria-roledescription="slide deck"
        aria-label="Slides"
        className={cn('flex flex-col bg-surface text-ink', themeClass(settings.theme), big ? 'h-screen w-screen' : 'overflow-hidden rounded-2xl border border-line shadow-card')}
      >
        <div
          className={cn('relative min-h-0', big && 'flex-1')}
          onClick={(e) => {
            // Full screen and in the audience's window, a click on the slide moves on, as on a projector
            if (big && !overview && !tool && !(e.target instanceof Element && e.target.closest('a, button'))) forward()
          }}
          onTouchStart={(e) => {
            touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
          }}
          onTouchEnd={(e) => {
            const from = touch.current
            touch.current = null
            if (!from || overview) return
            const dx = e.changedTouches[0].clientX - from.x
            const dy = e.changedTouches[0].clientY - from.y
            // Sideways, and clearly not a scroll down a long slide
            if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) {
              if (dx < 0) forward()
              else backward()
            }
          }}
        >
          <Stage
            fill={big}
            narrowFlow={!big}
            overlay={
              <>
                {overview ? (
                  <nav aria-label="All slides" className="absolute inset-0 overflow-y-auto bg-surface p-4">
                    <ol className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))] gap-3 p-0">
                      {slides.map((s, i) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            aria-label={`${i + 1}. ${s.title || 'Untitled slide'}`}
                            aria-current={i === index ? 'true' : undefined}
                            onClick={() => {
                              go(i)
                              setOverview(false)
                            }}
                            className="group flex w-full cursor-pointer flex-col gap-1.5 rounded-lg p-1 text-left focus-visible:outline-2 focus-visible:outline-brand"
                          >
                            <SlideThumb slide={s} second={seconds[i]} settings={settings} number={i + 1} className="transition-colors group-hover:border-brand-edge group-aria-[current]:border-brand group-aria-[current]:ring-2 group-aria-[current]:ring-brand">
                              {bodies[i]}
                            </SlideThumb>
                            <span className="flex gap-1.5 text-[0.8rem] leading-snug">
                              <span className="font-bold text-muted tabular-nums">{i + 1}</span>
                              <span className="truncate font-semibold text-ink">{s.title || 'Untitled slide'}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </nav>
                ) : null}
                {/* B (or W): the screen goes black (or white), for the room to look at the speaker; again, or a click, brings it back */}
                {screen && big ? (
                  <button type="button" aria-label="Show the slides again" onClick={() => blankOut(null)} className={cn('absolute inset-0 z-10 cursor-default border-0', screen === 'white' ? 'bg-white' : 'bg-black')} />
                ) : null}
                {audience && !fullscreen ? (
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="absolute right-3 bottom-3 z-10 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface/90 px-3 py-2 text-[0.85rem] font-semibold text-ink shadow-card backdrop-blur hover:bg-fill focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <Maximize size={16} aria-hidden /> Full screen
                  </button>
                ) : null}
              </>
            }
          >
            {slides.map((s, i) => (
              <section
                key={s.id}
                ref={(el) => {
                  sections.current[i] = el
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${i + 1} of ${count}${s.title ? `: ${s.title}` : ''}`}
                hidden={i !== index || overview}
                className={cn('absolute inset-0 overflow-y-auto', arrive(s))}
              >
                <SlideView slide={s} second={seconds[i]} chrome={slideChrome(settings, i + 1, s.layout)}>
                  {bodies[i]}
                </SlideView>
              </section>
            ))}
            {overview ? null : <InkLayer tool={tool} strokes={ink[slides[index].id] ?? []} laser={laser} onLaser={point} onDraw={(strokes) => draw(slides[index].id, strokes)} />}
          </Stage>
        </div>
        {audience ? null : (
          <>
            {/* How far through it is */}
            <div aria-hidden className="h-1 bg-fill">
              <div className="h-full bg-brand transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${((index + 1) / count) * 100}%` }} />
            </div>
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button type="button" aria-label="Previous slide" disabled={atStart} onClick={backward} className={control}>
                <ChevronLeft aria-hidden />
              </button>
              <span aria-live={playing ? 'off' : 'polite'} className="min-w-16 text-center text-[0.85rem] text-muted tabular-nums">
                {index + 1} / {count}
              </span>
              <button type="button" aria-label="Next slide" disabled={atEnd} onClick={() => forward()} className={control}>
                <ChevronRight aria-hidden />
              </button>
              <span className="ml-2 truncate text-[0.85rem] text-muted max-sm:hidden">
                {slides[index].title}
                {points ? (
                  <span className="tabular-nums">
                    {' '}
                    · {step} of {points} points in
                  </span>
                ) : null}
              </span>
              {screen && !big ? (
                <span role="status" className="ml-2 shrink-0 rounded-md bg-ink px-2 py-0.5 text-[0.75rem] font-bold text-surface">
                  {screen === 'white' ? 'Screen white' : 'Screen blanked'}
                </span>
              ) : null}
              {timed && count > 1 ? (
                <button type="button" aria-label={playing ? 'Pause' : autoplay ? `Play by itself, a slide every ${autoplay} seconds` : 'Play by itself, on each slide’s own time'} aria-pressed={playing} onClick={() => setPlaying((p) => !p)} className={cn(control, 'ml-auto')}>
                  {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
                </button>
              ) : null}
              <span className={cn('flex items-center gap-1 max-sm:hidden', !(timed && count > 1) && 'ml-auto')}>
                <button type="button" aria-label="Laser pointer (L)" aria-pressed={tool === 'laser'} onClick={() => pickUp('laser')} className={control}>
                  <Crosshair aria-hidden />
                </button>
                <button type="button" aria-label="Pen (D)" aria-pressed={tool === 'pen'} onClick={() => pickUp('pen')} className={control}>
                  <PenLine aria-hidden />
                </button>
                {ink[slides[index].id]?.length ? (
                  <button type="button" aria-label="Rub out the drawing on this slide (E)" onClick={() => draw(slides[index].id, [])} className={control}>
                    <Eraser aria-hidden />
                  </button>
                ) : null}
              </span>
              <button type="button" aria-label="All slides" aria-pressed={overview} onClick={() => setOverview((o) => !o)} className={cn(control, !(timed && count > 1) && 'max-sm:ml-auto')}>
                <LayoutGrid aria-hidden />
              </button>
              <button type="button" aria-label={fullscreen ? 'Leave full screen' : 'Present full screen'} onClick={toggleFullscreen} className={control}>
                {fullscreen ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
              </button>
            </div>
          </>
        )}
      </div>
      {presenting ? (
        <aside aria-label="Speaker notes" className="grid gap-x-6 gap-y-4 rounded-xl border border-line bg-fill px-4 py-3 md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="flex flex-col gap-1.5" aria-live="polite">
            <h2 className="m-0 text-[0.75rem] font-bold tracking-wide text-muted uppercase">Speaker notes</h2>
            <p className={cn('m-0 text-[1.05rem] leading-relaxed whitespace-pre-wrap', notes?.[index] ? 'text-ink' : 'text-muted')}>{notes?.[index] || 'None for this slide.'}</p>
          </div>
          <div className="flex flex-col gap-2 text-[0.85rem]">
            <span className="text-[0.75rem] font-bold tracking-wide text-muted uppercase">Next</span>
            {step < points ? (
              <span className="text-ink">
                {points - step === 1 ? 'One more point' : `${points - step} more points`} on this slide, then:
              </span>
            ) : null}
            {index + 1 < count ? (
              <>
                <SlideThumb slide={slides[index + 1]} second={seconds[index + 1]} settings={settings} number={index + 2}>
                  {bodies[index + 1]}
                </SlideThumb>
                <span className="text-ink">{slides[index + 1].title || `Slide ${index + 2}`}</span>
              </>
            ) : (
              <span className="text-ink">The end</span>
            )}
            <span className="mt-1 flex items-center gap-2 text-muted">
              <span role="timer" aria-label="Time presenting" className="text-[1.05rem] font-bold text-ink tabular-nums">
                {clock(elapsed)}
              </span>
              <button type="button" aria-label="Start the clock over" onClick={() => setElapsed(0)} className="grid size-7 cursor-pointer place-items-center rounded-md hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand [&>svg]:size-4">
                <RotateCcw aria-hidden />
              </button>
              {now ? (
                <span className="ml-auto tabular-nums" aria-label="Time of day">
                  {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              ) : null}
            </span>
            {audienceHref ? (
              <div className="mt-1 flex flex-col gap-1.5 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={openAudience}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 font-semibold text-ink hover:bg-fill focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <MonitorUp size={15} aria-hidden /> {audienceOpen ? 'Bring up the audience window' : 'Open the audience window'}
                </button>
                <span role="status" className="text-[0.78rem] text-muted">
                  {audienceOpen ? 'The audience window follows this one. Drag it to the projector and press F there.' : 'It opens the slides alone in their own window, to put on the projector while you keep your notes here.'}
                </span>
              </div>
            ) : null}
          </div>
        </aside>
      ) : null}
    </>
  )
}
