'use client'

import { ChevronDown, List, X } from 'lucide-react'
import { type FC, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

export type TocEntry = {
  /** The #link of what it points to */
  readonly id: string
  readonly label: string
  /** A short mark before the label, e.g. "IV" for Article IV */
  readonly marker?: string
  /** Its own parts, shown under it while it's the one being read */
  readonly children?: readonly TocEntry[]
}

export type TableOfContentsProps = {
  entries: readonly TocEntry[]
  title?: string
  className?: string
}

/**
 * Which entry, and which of its parts, is being read: the first whose part of the page is
 * in the band near the top of the window (under the header)
 */
const useReading = (entries: readonly TocEntry[]) => {
  const [reading, setReading] = useState<{ entry?: string; part?: string }>({})
  const key = entries.map((e) => [e.id, ...(e.children ?? []).map((c) => c.id)].join(',')).join(';')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const shown = new Set<string>()
    const observer = new IntersectionObserver(
      (changes) => {
        for (const c of changes) {
          if (c.isIntersecting) shown.add(c.target.id)
          else shown.delete(c.target.id)
        }
        const entry = entries.find((e) => shown.has(e.id))
        if (!entry) return
        setReading({ entry: entry.id, part: entry.children?.find((c) => shown.has(c.id))?.id })
      },
      { rootMargin: '-20% 0px -65% 0px' }
    )
    for (const e of entries) {
      for (const id of [e.id, ...(e.children ?? []).map((c) => c.id)]) {
        const el = document.getElementById(id)
        if (el) observer.observe(el)
      }
    }
    return () => observer.disconnect()
    // The ids are what matter; a new array of the same entries needn't start over
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return reading
}

/** Whether an element has scrolled up out of view (it's above the window, not below it) */
const useScrolledPast = <T extends Element>() => {
  const ref = useRef<T>(null)
  const [past, setPast] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < 0))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, past] as const
}

const linkClass = (current: boolean) =>
  cn(
    'flex gap-2 rounded-md border-l-2 py-1 pr-2 pl-3 text-[0.9rem] leading-snug no-underline transition-colors focus-visible:outline-2 focus-visible:outline-brand',
    current ? 'border-brand font-semibold text-brand' : 'border-transparent text-muted hover:border-line hover:text-ink'
  )

const Label: FC<{ entry: TocEntry }> = ({ entry }) => (
  <>
    {entry.marker ? <span className="w-7 shrink-0 font-semibold text-ink-soft tabular-nums">{entry.marker}</span> : null}
    <span className="min-w-0">{entry.label}</span>
  </>
)

/** The entries as links, with the part being read marked (and, beside the page, its own parts under it) */
const Entries: FC<{ entries: readonly TocEntry[]; reading: { entry?: string; part?: string }; withParts: boolean; onFollow?: () => void }> = ({ entries, reading, withParts, onFollow }) => (
  <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
    {entries.map((e) => {
      const current = reading.entry === e.id
      return (
        <li key={e.id}>
          <a href={`#${e.id}`} onClick={onFollow} className={linkClass(current)} aria-current={current && !reading.part ? 'location' : undefined}>
            <Label entry={e} />
          </a>
          {withParts && current && e.children?.length ? (
            <ol className={cn('m-0 mt-0.5 mb-1 flex list-none flex-col gap-0.5 p-0', e.marker ? 'pl-10' : 'pl-3')}>
              {e.children.map((c) => (
                <li key={c.id}>
                  <a href={`#${c.id}`} onClick={onFollow} className={cn(linkClass(reading.part === c.id), 'text-[0.84rem]')} aria-current={reading.part === c.id ? 'location' : undefined}>
                    {c.label}
                  </a>
                </li>
              ))}
            </ol>
          ) : null}
        </li>
      )
    })}
  </ol>
)

/**
 * A page's contents as links: beside the page on wide screens, staying in view as it
 * scrolls and marking the part being read (with that part's own parts under it). On narrow
 * ones, a list that opens and closes above the page, and, once that's scrolled away, a
 * Contents button in the corner that opens it over the page from wherever the reader is.
 */
export const TableOfContents: FC<TableOfContentsProps> = ({ entries, title = 'On this page', className }) => {
  const reading = useReading(entries)
  const [inline, scrolledPast] = useScrolledPast<HTMLDetailsElement>()
  const [floatingOpen, setFloatingOpen] = useState(false)
  const floating = useRef<HTMLDivElement>(null)

  // The floating panel closes on Esc, or a tap anywhere outside it
  useEffect(() => {
    if (!floatingOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFloatingOpen(false)
    const onDown = (e: PointerEvent) => floating.current?.contains(e.target as Node) || setFloatingOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [floatingOpen])

  const current = entries.find((e) => e.id === reading.entry)

  return (
    <nav aria-label={title} className={cn('lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:max-h-[calc(100dvh-var(--header-height)-3rem)] lg:overflow-y-auto', className)}>
      {/* Narrow screens: closed until asked for, so the page starts with the page */}
      <details ref={inline} className="group rounded-xl border border-line bg-fill lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[0.95rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
          {title}
          <ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="border-t border-line p-2">
          <Entries entries={entries} reading={{}} withParts={false} />
        </div>
      </details>

      {/* Narrow screens, once that's scrolled away: the contents from anywhere on the page */}
      {scrolledPast ? (
        <div ref={floating} className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-2 lg:hidden">
          {floatingOpen ? (
            <div id="floating-contents" className="max-h-[60dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface p-2 shadow-xl">
              <p className="m-0 px-3 pt-1 pb-2 text-[0.8rem] font-bold tracking-wide text-muted uppercase">{title}</p>
              <Entries entries={entries} reading={reading} withParts={false} onFollow={() => setFloatingOpen(false)} />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setFloatingOpen((o) => !o)}
            aria-expanded={floatingOpen}
            aria-controls="floating-contents"
            className="inline-flex max-w-[calc(100vw-2rem)] cursor-pointer items-center gap-2 rounded-full border border-line bg-surface py-2.5 pr-4 pl-3.5 text-[0.9rem] font-semibold text-ink shadow-lg hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {floatingOpen ? <X size={17} aria-hidden /> : <List size={17} aria-hidden />}
            <span className="truncate">
              {floatingOpen ? 'Close' : current ? (current.marker ? `${current.marker} · ${current.label}` : current.label) : 'Contents'}
            </span>
            {floatingOpen ? null : <span className="sr-only">: open the contents</span>}
          </button>
        </div>
      ) : null}

      {/* Wide screens: always there, following along */}
      <div className="hidden flex-col gap-2 lg:flex">
        <p className="m-0 pl-3 text-[0.8rem] font-bold tracking-wide text-muted uppercase">{title}</p>
        <Entries entries={entries} reading={reading} withParts />
      </div>
    </nav>
  )
}
