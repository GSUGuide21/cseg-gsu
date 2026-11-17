import { Check, ChevronDown, LayoutGrid, List, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState } from '@/components'
import { Input } from '@/components/Form'
import { button, eyebrow } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getSearchIndex, getSiteChrome } from '@/lib/dashboard/public'
import { groupResults, searchWithTotal, searchWords, type SearchResult } from '@/lib/search'
import { SITE_BOOST } from '@/globals/Search/siteBoost'
import { SITE_ICONS, SITE_KINDS, SITE_ORDER } from '@/globals/Search/siteKinds'

import { ResultGroups, type ResultGroup } from './ResultGroups'

// Results pages aren't worth a search engine's time
export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } }

type Sort = 'best' | 'recent' | 'az'
type View = 'grid' | 'list'
interface State {
  query: string
  types: string[]
  sort: Sort
  view: View
  filters: boolean
}

const SORTS: Record<Sort, string> = { best: 'Best match', recent: 'Most recent', az: 'Name (A–Z)' }
/** How many of a kind show under its heading when every kind is shown */
const PER_GROUP = 8

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) ?? ''

/** The page's address for a state: only what differs from the defaults */
const hrefFor = (state: State, change: Partial<State> = {}) => {
  const s = { ...state, ...change }
  const p = new URLSearchParams({ q: s.query })
  if (s.types.length) p.set('type', s.types.join(','))
  if (s.sort !== 'best') p.set('sort', s.sort)
  if (s.view !== 'grid') p.set('view', s.view)
  if (!s.filters) p.set('filters', '0')
  return `/search?${p}`
}

const sorted = (results: readonly SearchResult[], sort: Sort) => {
  if (sort === 'az') return [...results].sort((a, b) => a.title.localeCompare(b.title))
  if (sort === 'recent') {
    const time = (r: SearchResult) => (r.date ? Date.parse(r.date) || -Infinity : -Infinity)
    return [...results].sort((a, b) => time(b) - time(a))
  }
  return results
}

/** A box that looks checked or not: the filters are links, so they work before the page's JavaScript has loaded */
const Box = ({ on, round }: { on: boolean; round?: boolean }) => (
  <span
    aria-hidden
    className={cn(
      'grid size-[1.1rem] shrink-0 place-items-center border-2 transition-colors',
      round ? 'rounded-full' : 'rounded-[0.3rem]',
      on ? 'border-brand bg-brand text-white' : 'border-[color-mix(in_srgb,var(--fg)_35%,var(--bg))] group-hover:border-brand'
    )}
  >
    {on ? round ? <span className="size-1.5 rounded-full bg-white" /> : <Check size={12} strokeWidth={3.5} /> : null}
  </span>
)

/** Search across the site: results under their kinds, with filters by kind beside them. Works as plain links and a form, before any JavaScript. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; type?: string | string[]; sort?: string | string[]; view?: string | string[]; filters?: string | string[] }> }) {
  const params = await searchParams
  const query = first(params.q).trim().slice(0, 200)
  const sortParam = first(params.sort)
  const state: State = {
    query,
    types: [...new Set(first(params.type).split(',').map((t) => t.trim()).filter((t) => t in SITE_KINDS))],
    sort: sortParam === 'recent' || sortParam === 'az' ? sortParam : 'best',
    view: first(params.view) === 'list' ? 'list' : 'grid',
    filters: first(params.filters) !== '0',
  }

  const [{ search: words }, found] = await Promise.all([
    getSiteChrome(),
    query ? getSearchIndex().then((index) => searchWithTotal(index, query, { limit: 1000, boost: SITE_BOOST })) : { results: [], total: 0, kinds: {} as Record<string, number> },
  ])

  const shown = sorted(state.types.length ? found.results.filter((r) => state.types.includes(r.kind)) : found.results, state.sort)
  // Kinds in the order their best result comes, so the best match is near the top
  const cut = state.types.length !== 1
  const groups: ResultGroup[] = groupResults(shown).map(({ kind, results }) => ({
    kind,
    total: results.length,
    results: cut ? results.slice(0, PER_GROUP) : results,
    moreHref: cut && results.length > PER_GROUP ? hrefFor(state, { types: [kind] }) : undefined,
  }))
  const facets = [...SITE_ORDER.filter((k) => found.kinds[k]), ...Object.keys(found.kinds).filter((k) => !(SITE_ORDER as readonly string[]).includes(k))]
  const toggle = (kind: string) => (state.types.includes(kind) ? state.types.filter((t) => t !== kind) : [...state.types, kind])
  const label = (kind: string) => SITE_KINDS[kind]?.label ?? kind

  const typeFilters = (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      <li>
        <Link href={hrefFor(state, { types: [] })} aria-current={!state.types.length ? 'true' : undefined} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 text-[0.9rem] text-ink no-underline hover:bg-fill">
          <Box on={!state.types.length} round />
          <span className="flex-1">All</span>
          <span className="text-[0.8rem] text-ink-faint tabular-nums">{found.total}</span>
        </Link>
      </li>
      {facets.map((kind) => {
        const on = state.types.includes(kind)
        return (
          <li key={kind}>
            <Link href={hrefFor(state, { types: toggle(kind) })} aria-current={on ? 'true' : undefined} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 text-[0.9rem] text-ink no-underline hover:bg-fill">
              <Box on={on} />
              <span className="flex-1">{label(kind)}</span>
              <span className="text-[0.8rem] text-ink-faint tabular-nums">{found.kinds[kind]}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  const toolbarLink = 'inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.88rem] font-medium text-ink no-underline hover:bg-fill focus-visible:outline-2 focus-visible:outline-brand'

  return (
    <div className="mx-auto flex max-w-7xl flex-col px-[clamp(1rem,4vw,2rem)] pt-[clamp(2rem,5vw,3.5rem)] pb-[clamp(3.5rem,8vw,6rem)]">
      <header className="flex flex-col gap-4 pb-6">
        <div className="flex flex-col gap-1.5">
          <span className={eyebrow}>Search</span>
          <h1 className="m-0 text-[clamp(1.6rem,3.5vw,2.2rem)] leading-tight font-bold text-ink">{words.title}</h1>
          {words.lead ? <p className="m-0 max-w-2xl text-muted">{words.lead}</p> : null}
        </div>
        <form action="/search" role="search" className="flex max-w-3xl flex-wrap gap-2">
          <Input name="q" type="search" aria-label="Search the site" defaultValue={query} placeholder={words.placeholder || undefined} leading={<Search size={16} aria-hidden />} className="min-w-56 flex-1" />
          {state.types.length ? <input type="hidden" name="type" value={state.types.join(',')} /> : null}
          {state.sort !== 'best' ? <input type="hidden" name="sort" value={state.sort} /> : null}
          {state.view !== 'grid' ? <input type="hidden" name="view" value={state.view} /> : null}
          {!state.filters ? <input type="hidden" name="filters" value="0" /> : null}
          <button type="submit" className={button()}>
            Search
          </button>
        </form>
      </header>

      {!query ? (
        words.suggestions.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 border-t border-line p-0 pt-6" aria-label="Suggested searches">
            {words.suggestions.map((s) => (
              <li key={s}>
                <Link href={`/search?q=${encodeURIComponent(s)}`} className={button({ variant: 'outline', size: 'sm' })}>
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        ) : null
      ) : !found.total ? (
        <EmptyState bordered icon={<Search />} title={words.emptyTitle} description={words.emptyText || undefined} />
      ) : (
        <div className={cn('grid border-t border-line', state.filters && 'lg:grid-cols-[15rem_minmax(0,1fr)]')}>
          {state.filters ? (
            <aside aria-label="Filters" className="hidden border-r border-line py-5 pr-5 lg:block">
              <details open className="group/facet">
                <summary className="flex cursor-pointer list-none items-center justify-between px-2 pb-2 text-[0.95rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  Type
                  <ChevronDown size={16} aria-hidden className="text-ink-faint transition-transform group-open/facet:rotate-180" />
                </summary>
                {typeFilters}
              </details>
            </aside>
          ) : null}

          <div className={cn('flex min-w-0 flex-col', state.filters && 'lg:pl-6')}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-3">
              <Link href={hrefFor(state, { filters: !state.filters })} className={cn(toolbarLink, 'hidden lg:inline-flex')}>
                {state.filters ? <PanelLeftClose size={17} aria-hidden /> : <PanelLeftOpen size={17} aria-hidden />}
                {state.filters ? 'Hide filters' : 'Show filters'}
              </Link>
              <details className="group/sort relative">
                <summary className={cn(toolbarLink, 'cursor-pointer list-none [&::-webkit-details-marker]:hidden')}>
                  <span className="text-ink-faint">Sort by:</span> {SORTS[state.sort]}
                  <ChevronDown size={15} aria-hidden className="transition-transform group-open/sort:rotate-180" />
                </summary>
                <ul className="absolute top-full left-0 z-20 m-0 mt-1 flex min-w-44 list-none flex-col rounded-xl border border-line bg-surface p-1 shadow-[0_10px_30px_rgb(0_0_0/0.12)]">
                  {(Object.keys(SORTS) as Sort[]).map((s) => (
                    <li key={s}>
                      <Link href={hrefFor(state, { sort: s })} aria-current={s === state.sort ? 'true' : undefined} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[0.88rem] text-ink no-underline hover:bg-fill aria-[current]:font-semibold aria-[current]:text-brand">
                        {SORTS[s]}
                        {s === state.sort ? <Check size={14} aria-hidden /> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
              <div role="group" aria-label="Show results as" className="ml-auto flex items-center gap-1">
                {(
                  [
                    ['list', 'List', <List key="i" size={18} aria-hidden />],
                    ['grid', 'Grid', <LayoutGrid key="i" size={18} aria-hidden />],
                  ] as const
                ).map(([v, name, icon]) => (
                  <Link
                    key={v}
                    href={hrefFor(state, { view: v })}
                    aria-label={name}
                    title={name}
                    aria-current={state.view === v ? 'true' : undefined}
                    className="grid size-9 place-items-center rounded-lg text-ink-faint hover:bg-fill hover:text-ink aria-[current]:bg-brand-tint aria-[current]:text-brand"
                  >
                    {icon}
                  </Link>
                ))}
              </div>
            </div>

            {/* On narrow screens the kinds are a row of chips */}
            <ul aria-label="Filter by type" className={cn('m-0 flex list-none gap-2 overflow-x-auto p-0 pt-4 [scrollbar-width:none]', state.filters && 'lg:hidden')}>
              {[null, ...facets].map((kind) => {
                const on = kind ? state.types.includes(kind) : !state.types.length
                return (
                  <li key={kind ?? 'all'} className="shrink-0">
                    <Link
                      href={hrefFor(state, { types: kind ? toggle(kind) : [] })}
                      aria-current={on ? 'true' : undefined}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.82rem] font-medium no-underline transition-colors',
                        on ? 'border-brand bg-brand-tint text-brand' : 'border-line text-ink hover:border-brand-edge'
                      )}
                    >
                      {kind ? label(kind) : 'All'} <span className="text-ink-faint tabular-nums">{kind ? found.kinds[kind] : found.total}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>

            <p aria-live="polite" className="m-0 pt-4 pb-1 text-[0.9rem] text-muted">
              {shown.length === 1 ? '1 result' : `${shown.length} results`} for <span className="font-semibold text-ink">“{query}”</span>
              {state.types.length ? (
                <>
                  {' '}
                  in {state.types.map(label).join(', ')} ·{' '}
                  <Link href={hrefFor(state, { types: [] })} className="text-brand">
                    Clear filters
                  </Link>
                </>
              ) : null}
            </p>

            {shown.length ? (
              <ResultGroups groups={groups} words={searchWords(query)} kinds={SITE_KINDS} icons={SITE_ICONS} view={state.view} />
            ) : (
              <EmptyState
                bordered
                icon={<Search />}
                title="Nothing of that type"
                description="Other types match this search."
                actions={
                  <Link href={hrefFor(state, { types: [] })} className={button({ variant: 'outline', size: 'sm' })}>
                    Show every type
                  </Link>
                }
                className="mt-4"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
