'use client'

import { ArrowRight, Clock, LayoutGrid, List, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FC, type FormEvent, type KeyboardEvent } from 'react'

import { cn } from '@/lib/cn'
import { searchWords, type SearchResult } from '@/lib/search'

import { Kbd } from '../Kbd'
import { Skeleton } from '../Skeleton'
import { useModalDialog } from '../useModalDialog'
import { CardBody, columns, frame, isExternal, layoutOf, type CardData } from './Layouts'
import { kindLabel } from './Results'
import type { QuickItem, SearchAnswer, SearchOverlayProps } from './types'

/** How long after the last keystroke the search is asked */
const PAUSE_MS = 150
const RECENT_MAX = 6

/** The bar, the filters, and the results share these edges, so they line up */
const row = 'mx-auto w-full max-w-[120rem] px-[clamp(1rem,3vw,2.5rem)]'

const readRecent = (key?: string): string[] => {
  if (!key) return []
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(saved) ? saved.filter((s): s is string => typeof s === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}
const writeRecent = (key: string | undefined, list: string[]) => {
  if (!key) return
  try {
    window.localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // Storage is off: recent searches just aren't remembered
  }
}

/** The quick items whose names (or other words) hold every word typed */
const matchQuick = (items: readonly QuickItem[], words: readonly string[]) =>
  items.filter((item) => {
    const hay = [item.label, item.description ?? '', ...(item.keywords ?? [])].join(' ').toLowerCase()
    return words.every((w) => hay.includes(w))
  })

/** A search's answer, as a list of results or with its counts */
const read = (answered: SearchResult[] | SearchAnswer) =>
  Array.isArray(answered) ? { results: answered, total: answered.length, kinds: null } : { results: answered.results, total: answered.total, kinds: answered.kinds ?? null }

/** One option of the list: a result, or a quick item shown as one */
type Option = { key: string; card: CardData; result?: SearchResult; item?: QuickItem }
const fromQuick = (item: QuickItem): Option => ({ key: `quick:${item.id}`, item, card: { kind: item.group, title: item.label, href: item.href, snippet: item.description, icon: item.icon } })
const fromResult = (result: SearchResult): Option => ({ key: `${result.kind}:${result.href}:${result.title}`, result, card: { ...result, icon: result.icon ?? undefined } })

/** A search to run: recent, or one to try */
const pill = cn(
  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[0.8rem] font-semibold text-ink-soft transition-colors',
  'hover:border-brand/50 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
)

/** A filter: a chip on a phone, a row with a radio dot down the side on a wide screen */
const chip = cn(
  pill,
  'aria-pressed:border-brand aria-pressed:bg-brand-solid aria-pressed:text-white',
  'lg:w-full lg:gap-3 lg:rounded-lg lg:border-0 lg:px-2 lg:py-1.5 lg:text-left lg:text-[0.9rem] lg:font-medium lg:text-ink lg:hover:bg-fill',
  'lg:aria-pressed:bg-brand-tint lg:aria-pressed:text-brand'
)
const Dot = () => (
  <span aria-hidden className="hidden size-[1.1rem] shrink-0 place-items-center rounded-full border-2 border-[color-mix(in_srgb,var(--fg)_35%,var(--bg))] transition-colors group-hover/f:border-brand group-aria-pressed/f:border-brand lg:grid">
    <span className="size-2 scale-0 rounded-full bg-brand transition-transform group-aria-pressed/f:scale-100" />
  </span>
)

/** A button in the bar over the results */
const tool =
  'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[0.88rem] font-medium text-ink transition-colors hover:bg-fill focus-visible:outline-2 focus-visible:outline-brand'

type Answer = { query: string; results: SearchResult[]; total: number; kinds: Record<string, number> | null }
/** One kind's own best results, asked for when its chip is picked */
type KindAnswer = { query: string; kind: string; results: SearchResult[] }

/**
 * Search over the whole screen. Across the top, a wide search bar. Under it, down the side
 * (a row of chips on a phone), the kinds to narrow the results to, with how many of each;
 * beside that, how many were found, a list/grid switch, and the results under headings for
 * their kinds, each kind laid out its own way (see SearchKind's `layout`): socials as slim
 * chips, events and news as pictures over their dates, the rest as tiles with the words
 * around the match. Before anything's typed, it suggests where to go, with recent searches
 * and suggested ones.
 *
 * The cursor stays in the box: ↑ and ↓ move the highlight through the results (as does the
 * mouse), Enter or the Search button opens the highlighted one, and Escape closes.
 *
 *   <SearchOverlay open={open} onClose={…} search={(q, signal) => fetch(…, { signal }).then(…)} />
 */
export const SearchOverlay: FC<SearchOverlayProps> = ({
  open,
  onClose,
  search,
  suggest,
  quick = [],
  suggestedCount = 9,
  kinds,
  icons,
  order = [],
  label = 'Search',
  placeholder = 'Search…',
  suggestions = [],
  emptyTitle = 'Nothing found',
  emptyText = 'Try a shorter search, or different words.',
  allResultsHref,
  recentKey,
  onNavigate,
}) => {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const [suggested, setSuggested] = useState<SearchResult[]>([])
  const [byKind, setByKind] = useState<KindAnswer | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filtersShown, setFiltersShown] = useState(true)
  useModalDialog(dialog, open)

  // What's worth showing before anything's typed, asked each time it opens (what's coming up changes)
  useEffect(() => {
    if (!open || !suggest) return
    const controller = new AbortController()
    suggest(controller.signal).then(
      (results) => !controller.signal.aborted && setSuggested(results),
      () => undefined
    )
    return () => controller.abort()
  }, [open, suggest])

  // Opening: what was typed last time stays, selected, so typing replaces it
  useEffect(() => {
    if (!open) return
    setRecent(readRecent(recentKey))
    setActive(0)
    const box = input.current
    requestAnimationFrame(() => {
      box?.focus()
      box?.select()
    })
  }, [open, recentKey])

  // Asking, once typing pauses. What's shown stays until the new answer comes, so it doesn't flicker.
  const trimmed = query.trim()
  useEffect(() => {
    if (!open) return
    setFilter(null)
    setActive(0)
    setFailed(false)
    if (!trimmed) {
      setAnswer(null)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(() => {
      search(trimmed, controller.signal).then(
        (answered) => {
          if (controller.signal.aborted) return
          setAnswer({ query: trimmed, ...read(answered) })
          setLoading(false)
        },
        () => {
          if (controller.signal.aborted) return
          setFailed(true)
          setLoading(false)
        }
      )
    }, PAUSE_MS)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [open, trimmed, search])

  useEffect(() => {
    if (!open || !filter || !answer || answer.query !== trimmed) return setByKind(null)
    const matched = answer.kinds?.[filter] ?? 0
    const sent = answer.results.filter((r) => r.kind === filter).length
    if (matched <= sent) return setByKind(null)
    const controller = new AbortController()
    setLoading(true)
    search(trimmed, controller.signal, filter).then(
      (answered) => {
        if (controller.signal.aborted) return
        setByKind({ query: trimmed, kind: filter, results: read(answered).results })
        setLoading(false)
      },
      () => !controller.signal.aborted && setLoading(false)
    )
    return () => controller.abort()
  }, [open, filter, answer, trimmed, search])

  const words = useMemo(() => searchWords(trimmed), [trimmed])
  // Every option: quick items that match first (screens, actions: found at once, whatever the server says), then
  // the server's results; before anything's typed, the suggested ones
  const options = useMemo<Option[]>(() => {
    if (!trimmed) {
      // Where most people go, mixed with what's on (the next events, the latest news)
      const go = quick.slice(0, suggestedCount).map(fromQuick)
      const on = suggested.map(fromResult)
      const mixed: Option[] = []
      for (let i = 0; i < Math.max(go.length, on.length); i++) mixed.push(...(go[i] ? [go[i]] : []), ...(on[i] ? [on[i]] : []))
      return mixed
    }
    // One kind picked, and its own best asked for: those; otherwise the best of every kind
    const results = byKind && byKind.kind === filter && byKind.query === answer?.query ? byKind.results : (answer?.results ?? [])
    // A quick item going where a result does is the same thing twice: the result, with more to say, stays
    const going = new Set(results.map((r) => r.href))
    return [...matchQuick(quick, words).filter((item) => !item.href || !going.has(item.href)).map(fromQuick), ...results.map(fromResult)]
  }, [trimmed, words, answer, quick, suggestedCount, suggested, byKind, filter])
  const counts = useMemo(() => {
    const each = new Map<string, number>()
    for (const o of options) each.set(o.card.kind, (each.get(o.card.kind) ?? 0) + 1)
    // Every match of each kind, not only those sent: the search counted them
    if (trimmed && answer?.kinds) for (const [kind, n] of Object.entries(answer.kinds)) each.set(kind, Math.max(n, each.get(kind) ?? 0))
    const rank = (k: string) => (order.includes(k) ? order.indexOf(k) : order.length)
    return [...each].sort(([a], [b]) => rank(a) - rank(b))
  }, [options, order, trimmed, answer])
  const everything = counts.reduce((sum, [, n]) => sum + n, 0)
  const shown = useMemo(() => (filter ? options.filter((o) => o.card.kind === filter) : options), [options, filter])
  // Shown under their kinds, in the order each kind's best comes; the arrow keys go through them in that order
  const groups = useMemo(() => {
    const each = new Map<string, Option[]>()
    for (const o of shown) each.set(o.card.kind, [...(each.get(o.card.kind) ?? []), o])
    let start = 0
    return [...each].map(([kind, opts]) => {
      const group = { kind, options: opts, start }
      start += opts.length
      return group
    })
  }, [shown])
  const ordered = useMemo(() => groups.flatMap((g) => g.options), [groups])

  const remember = useCallback(() => {
    if (!trimmed) return
    const next = [trimmed, ...readRecent(recentKey).filter((r) => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, RECENT_MAX)
    setRecent(next)
    writeRecent(recentKey, next)
  }, [trimmed, recentKey])

  /** Opening an option: this site's in place (the search closes), another site's in a new tab */
  const go = useCallback(
    (option: Option) => {
      remember()
      onClose()
      if (option.item?.onSelect) return option.item.onSelect()
      const href = option.card.href
      if (!href) return
      if (isExternal(href)) window.open(href, '_blank', 'noopener,noreferrer')
      else if (onNavigate) onNavigate(href)
      else window.location.assign(href)
    },
    [remember, onClose, onNavigate]
  )

  const optionId = (i: number) => `${listId}-option-${i}`
  const move = (next: number) => {
    setActive(next)
    requestAnimationFrame(() => document.getElementById(optionId(next))?.scrollIntoView({ block: 'nearest' }))
  }
  const onBoxKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!ordered.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      move((active + 1) % ordered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      move((active - 1 + ordered.length) % ordered.length)
    }
  }
  /** Enter, or the Search button: the highlighted option */
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const option = ordered[active]
    if (option) go(option)
    else input.current?.focus()
  }
  const runQuery = (next: string) => {
    setQuery(next)
    input.current?.focus()
  }

  // More matched than are shown: say so, and offer them all
  const matched = filter ? (counts.find(([k]) => k === filter)?.[1] ?? shown.length) : everything
  const more = trimmed && answer ? Math.max(0, matched - shown.length) : 0
  const status = !trimmed
    ? 'Suggested'
    : failed
      ? 'The search didn’t go through'
      : loading && !answer && !shown.length
        ? 'Searching…'
        : more
          ? `Top ${shown.length} of ${shown.length + more} results for “${trimmed}”`
          : `${shown.length} ${shown.length === 1 ? 'result' : 'results'} for “${trimmed}”`
  const empty = !!trimmed && !!answer && !loading && !shown.length && !failed
  const now = Date.now()

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="m-0 size-full max-h-none max-w-none border-0 bg-surface p-0 text-ink not-open:hidden open:flex open:flex-col"
    >
      {open ? (
        <>
          {/* The search bar, across the whole width */}
          <form role="search" onSubmit={onSubmit} className="relative shrink-0 border-b border-line pt-[var(--navbar-safe-top)] motion-safe:animate-[cseg-fade-in_0.25s_ease-out_both]">
            <div className={cn(row, 'flex min-h-[clamp(4.5rem,9vw,6.5rem)] items-center gap-[clamp(0.6rem,1.5vw,1.25rem)]')}>
              <Search size={26} strokeWidth={2.25} aria-hidden className="shrink-0 text-brand" />
              <input
                ref={input}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onBoxKey}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={shown.length ? optionId(active) : undefined}
                aria-autocomplete="list"
                aria-label={label}
                placeholder={placeholder}
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
                maxLength={200}
                className="h-14 min-w-0 flex-1 border-0 bg-transparent text-[clamp(1.25rem,3.2vw,2.25rem)] font-semibold tracking-tight text-ink outline-none placeholder:font-normal placeholder:text-ink-faint"
              />
              {query ? (
                <button type="button" onClick={() => runQuery('')} className="shrink-0 cursor-pointer text-[0.85rem] text-ink-faint hover:text-ink">
                  Clear
                </button>
              ) : null}
              <button
                type="submit"
                disabled={!shown.length}
                className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[0.6rem] bg-brand-solid px-4 text-[0.9rem] font-semibold text-white transition-colors hover:bg-brand-solid-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 max-sm:size-11 max-sm:justify-center max-sm:px-0"
              >
                <span className="max-sm:sr-only">Search</span>
                <ArrowRight size={16} aria-hidden />
              </button>
              {/* Searching: a line runs along the bottom of the bar */}
              {loading ? (
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
                  <span className="block h-full w-1/3 animate-indeterminate bg-brand" />
                </span>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search"
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[0.6rem] border border-line text-ink transition-colors hover:border-brand/50 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
          </form>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className={cn(row, 'flex flex-col', filtersShown && 'lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]')}>
              {/* Narrowing to one kind: a row of chips on a phone, a list down the side on a wide screen */}
              <aside className={cn('border-b border-line lg:sticky lg:top-0 lg:self-start lg:border-r lg:border-b-0 lg:py-5 lg:pr-5', !filtersShown && 'lg:hidden')}>
                <p className="m-0 hidden px-2 pb-2 text-[0.95rem] font-semibold text-ink lg:block">Type</p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-3 scrollbar-thin max-lg:[mask-image:linear-gradient(to_right,black_85%,transparent)] lg:mx-0 lg:flex-col lg:gap-0.5 lg:p-0" role="group" aria-label="Filter results">
                  {[null, ...counts.map(([kind]) => kind)].map((kind) => (
                    <button
                      key={kind ?? ''}
                      type="button"
                      aria-pressed={filter === kind}
                      onClick={() => {
                        setFilter(kind === null || filter === kind ? null : kind)
                        setActive(0)
                        input.current?.focus()
                      }}
                      className={cn(chip, 'group/f shrink-0')}
                    >
                      <Dot />
                      {kind ? kindLabel(kinds, kind) : 'All'} <span className="text-[0.72rem] tabular-nums opacity-70 lg:ml-auto lg:text-[0.8rem] lg:text-ink-faint lg:opacity-100">{kind ? counts.find(([k]) => k === kind)?.[1] : everything}</span>
                    </button>
                  ))}
                </div>
              </aside>

              <div className={cn('flex min-w-0 flex-col gap-5 pb-5 motion-safe:animate-[cseg-fade-in_0.3s_ease-out_both]', filtersShown && 'lg:pl-6')}>
                {/* How many were found, and how to show them */}
                <div className="flex items-center gap-3 border-b border-line py-2.5">
                  <button type="button" onClick={() => setFiltersShown(!filtersShown)} className={cn(tool, 'max-lg:hidden')}>
                    {filtersShown ? <PanelLeftClose size={17} aria-hidden /> : <PanelLeftOpen size={17} aria-hidden />}
                    {filtersShown ? 'Hide filters' : 'Show filters'}
                  </button>
                  <p className="m-0 min-w-0 flex-1 truncate text-[0.85rem] text-muted" aria-live="polite">
                    {status}
                  </p>
                  <div role="group" aria-label="Show results as" className="flex shrink-0 items-center gap-1">
                    {(
                      [
                        ['list', 'List', <List key="i" size={18} aria-hidden />],
                        ['grid', 'Grid', <LayoutGrid key="i" size={18} aria-hidden />],
                      ] as const
                    ).map(([v, name, icon]) => (
                      <button
                        key={v}
                        type="button"
                        aria-label={name}
                        title={name}
                        aria-pressed={view === v}
                        onClick={() => {
                          setView(v)
                          input.current?.focus()
                        }}
                        className="grid size-9 cursor-pointer place-items-center rounded-lg text-ink-faint transition-colors hover:bg-fill hover:text-ink aria-pressed:bg-brand-tint aria-pressed:text-brand"
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {!trimmed && (recent.length || suggestions.length) ? (
                  <div className="flex flex-col gap-3">
                    {recent.length ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[0.78rem] font-semibold text-ink-faint">Recent</span>
                        {recent.map((r) => (
                          <button key={r} type="button" onClick={() => runQuery(r)} className={pill}>
                            <Clock size={13} aria-hidden /> {r}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setRecent([])
                            writeRecent(recentKey, [])
                          }}
                          className="cursor-pointer text-[0.78rem] text-ink-faint hover:text-ink hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                    {suggestions.length ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[0.78rem] font-semibold text-ink-faint">Try</span>
                        {suggestions.map((s) => (
                          <button key={s} type="button" onClick={() => runQuery(s)} className={pill}>
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {failed ? <p className={cn('m-0 text-center text-[1rem] text-danger', !shown.length && 'py-10')}>The search didn’t go through. Check your connection and try again.</p> : null}

                {empty ? (
                  <div className="flex flex-col items-center gap-4 py-16 text-center">
                    <p className="m-0 text-[1.05rem] text-ink-soft">
                      {emptyTitle}: nothing matches <q className="font-bold text-ink">{trimmed}</q>
                      {filter ? ' in this filter' : ''}.
                    </p>
                    {emptyText ? <p className="m-0 max-w-md text-[0.92rem] text-muted">{emptyText}</p> : null}
                    <div className="flex flex-wrap justify-center gap-2">
                      {filter ? (
                        <button type="button" onClick={() => setFilter(null)} className={pill}>
                          Search everything
                        </button>
                      ) : null}
                      {suggestions.map((s) => (
                        <button key={s} type="button" onClick={() => runQuery(s)} className={pill}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {loading && !answer && !shown.length ? (
                  <div aria-hidden className={cn('grid', columns.tile)}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} height={76} className="rounded-xl" />
                    ))}
                  </div>
                ) : null}

                {/* The results, under their kinds, each kind laid out its own way */}
                <div id={listId} role="listbox" aria-label="Results" className={cn('flex flex-col', loading && answer && 'opacity-70')}>
                  {groups.map((g, gi) => {
                    const layout = layoutOf(kinds, g.kind, view === 'list')
                    const all = counts.find(([k]) => k === g.kind)?.[1] ?? g.options.length
                    const headId = `${listId}-group-${gi}`
                    return (
                      <div key={g.kind} role="group" aria-labelledby={headId} className="flex flex-col gap-3.5 border-t border-line py-5 first:border-t-0 first:pt-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <span id={headId} className="text-[1.05rem] font-bold text-ink">
                            {kindLabel(kinds, g.kind)} <span className="text-[0.8rem] font-medium text-ink-faint">{all}</span>
                          </span>
                          {trimmed && !filter && all > g.options.length ? (
                            <button
                              type="button"
                              onClick={() => {
                                setFilter(g.kind)
                                setActive(0)
                                input.current?.focus()
                              }}
                              className="inline-flex cursor-pointer items-center gap-1 text-[0.83rem] font-semibold text-brand hover:underline"
                            >
                              See all {all} <ArrowRight size={14} aria-hidden />
                            </button>
                          ) : null}
                        </div>
                        <div role="presentation" className={cn('grid', columns[layout])}>
                          {g.options.map((option, oi) => {
                            const i = g.start + oi
                            return (
                              <div key={option.key} id={optionId(i)} role="option" aria-selected={i === active} className="group min-w-0" onMouseMove={() => i !== active && setActive(i)}>
                                <a
                                  href={option.card.href ?? '#'}
                                  tabIndex={-1}
                                  onClick={(e) => {
                                    // A new tab or window was asked for: let the browser do it
                                    if (option.card.href && (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)) return
                                    e.preventDefault()
                                    go(option)
                                  }}
                                  className={frame[layout]}
                                >
                                  <CardBody card={option.card} layout={layout} words={words} kinds={kinds} icons={icons} now={now} />
                                </a>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {trimmed && answer?.results.length && allResultsHref ? (
                  <a
                    href={allResultsHref(trimmed)}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                      e.preventDefault()
                      remember()
                      onClose()
                      if (onNavigate) onNavigate(allResultsHref(trimmed))
                      else window.location.assign(allResultsHref(trimmed))
                    }}
                    className="self-center text-[0.88rem] font-semibold text-brand underline underline-offset-[0.15em]"
                  >
                    {more && !filter ? `See all ${shown.length + more} results` : 'Open these results as a page'}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {/* What the keys do, on screens with a keyboard */}
          <div aria-hidden className="hidden shrink-0 border-t border-line sm:block">
            <div className={cn(row, 'flex gap-5 py-2.5 text-[0.72rem] text-ink-faint [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1')}>
              <span>
                <Kbd keys="↑" size="sm" />
                <Kbd keys="↓" size="sm" /> navigate
              </span>
              <span>
                <Kbd keys="↵" size="sm" /> open
              </span>
              <span>
                <Kbd keys="Esc" size="sm" /> close
              </span>
            </div>
          </div>
        </>
      ) : null}
    </dialog>
  )
}

export { ResultCard, SearchResults } from './Results'
export type { QuickItem, SearchKind, SearchOverlayProps, SearchResultsProps } from './types'
