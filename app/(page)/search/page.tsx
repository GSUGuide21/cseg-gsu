import { Search } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState } from '@/components'
import { Input } from '@/components/Form'
import { PageHeader } from '@/globals/Page'
import { button, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getSearchIndex } from '@/lib/dashboard/public'
import { searchContent } from '@/lib/search'

// Results pages aren't worth a search engine's time
export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } }

const isExternal = (href: string) => /^https?:/.test(href)

/** Search across the site. A plain form, so it works before the page's JavaScript has loaded. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams
  const query = (Array.isArray(q) ? q[0] : (q ?? '')).trim().slice(0, 200)
  const results = query ? searchContent(await getSearchIndex(), query) : []

  return (
    <div className={cn(pageShell, 'max-w-3xl gap-[clamp(1.5rem,3vw,2rem)]')}>
      <PageHeader eyebrow="Search" title="Find it on the site" lead="Posts, pages, campus resources, and places to eat." />
      <form action="/search" role="search" className="flex flex-wrap gap-2">
        <Input name="q" type="search" aria-label="Search the site" defaultValue={query} placeholder="Try “financial aid” or “late night food”" leading={<Search size={16} aria-hidden />} className="min-w-56 flex-1" />
        <button type="submit" className={button()}>
          Search
        </button>
      </form>

      {query ? (
        <p aria-live="polite" className="m-0 text-[0.9rem] text-muted">
          {results.length === 1 ? '1 result' : `${results.length} results`} for “{query}”
        </p>
      ) : null}

      {results.length ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {results.map((r) => (
            <li key={r.href + r.title}>
              <Link
                href={r.href}
                {...(isExternal(r.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group flex flex-col gap-1 rounded-2xl border border-line p-4 no-underline transition-colors hover:border-brand-edge"
              >
                <span className="text-[0.75rem] font-bold tracking-wide text-muted uppercase">{r.kind}</span>
                <span className="text-[1.1rem] font-bold text-ink group-hover:text-brand">{r.title}</span>
                {r.snippet ? <span className="text-[0.92rem] text-ink-soft">{r.snippet}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : query ? (
        <EmptyState bordered icon={<Search />} title="Nothing found" description="Try a shorter search, or different words." />
      ) : null}
    </div>
  )
}
