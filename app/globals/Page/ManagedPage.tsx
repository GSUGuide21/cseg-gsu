import { ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { FC, ReactNode } from 'react'

import { SiteContentProvider } from '@/globals/SiteContent'
import { DocumentBody, PageSections, sectionIds } from '@/lib/richtext'
import { hasLiveBlock } from '@/lib/richtext/blocks'
import { card, inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getSiteContent } from '@/lib/dashboard/public'
import { formatDate } from '@/lib/dashboard/format'
import { previewImagePath } from '@/lib/siteUrl'
import type { PageLink } from '@/lib/dashboard/public'
import type { PageRow } from '@/lib/supabase/types'

import { PageHeader } from '.'

type ShownPage = Pick<PageRow, 'title' | 'subtitle' | 'description' | 'layout' | 'sections' | 'body'> &
  Partial<Pick<PageRow, 'eyebrow' | 'show_toc' | 'show_updated' | 'updated_at'>>

type ManagedPageProps = {
  page: ShownPage
  eyebrow?: string
  /** The site's own part that comes first, between the title and what officers wrote (a guide's picks) */
  before?: ReactNode
  /** The site's own part that stays under what officers wrote (the Contact page's form, say) */
  after?: ReactNode
  /** The page this one sits under, for the trail above its title */
  parent?: PageLink | null
  /** The pages that sit under this one, listed at its foot */
  subpages?: readonly PageLink[]
  /** 2 where the page it's shown on already has its heading (under the campus map) */
  headingLevel?: 1 | 2
}

/** Above a page that sits under another: the way back up */
const Trail: FC<{ parent: PageLink; title: string }> = ({ parent, title }) => (
  <nav aria-label="Breadcrumb" className="-mb-4">
    <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-[0.85rem] text-muted">
      <li>
        <Link href={parent.href} className={inlineLink}>
          {parent.label}
        </Link>
      </li>
      <li aria-hidden className="flex">
        <ChevronRight size={14} />
      </li>
      <li aria-current="page" className="font-semibold text-ink-soft">
        {title}
      </li>
    </ol>
  </nav>
)

/** At the foot of a page others sit under: those pages, each with its line */
const Subpages: FC<{ pages: readonly PageLink[] }> = ({ pages }) => (
  <nav aria-label="In this section" className="flex flex-col gap-4">
    <h2 className="m-0 flex items-center gap-3 text-[1.35rem] font-bold text-ink">
      <span className="h-6 w-1 rounded-full bg-brand" aria-hidden />
      In this section
    </h2>
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4 p-0">
      {pages.map((p) => (
        <li key={p.href}>
          <Link
            href={p.href}
            className={card({ className: 'group flex h-full flex-col gap-1 px-5 py-4 no-underline transition-colors hover:border-brand/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand' })}
          >
            <span className="flex items-center justify-between gap-2 text-[1.02rem] font-bold text-ink">
              {p.label}
              <ChevronRight size={16} aria-hidden className="shrink-0 text-muted transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-brand" />
            </span>
            {p.description ? <span className="line-clamp-2 text-[0.88rem] leading-[1.55] text-muted">{p.description}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
)

/** The page's sections as links, for the sections layout's "On this page" */
const OnThisPage: FC<{ sections: ShownPage['sections'] }> = ({ sections }) => {
  const ids = sectionIds(sections)
  return (
    <nav aria-label="On this page" className="flex flex-col gap-2 rounded-xl border border-line bg-fill px-4 py-3">
      <p className="m-0 text-[0.8rem] font-bold tracking-wide text-muted uppercase">On this page</p>
      <ol className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0">
        {sections.map((s, i) => (
          <li key={ids[i]}>
            <a href={`#${ids[i]}`} className={cn(inlineLink, 'text-[0.92rem]')}>
              {s.title || 'Untitled section'}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

const Content: FC<ManagedPageProps> = ({ page, eyebrow = 'CSEG', before, after, parent, subpages, headingLevel }) => {
  const trail = parent ? <Trail parent={parent} title={page.title} /> : null
  const below = subpages?.length ? <Subpages pages={subpages} /> : null
  const lead = page.subtitle ?? page.description ?? undefined
  const label = page.eyebrow?.trim() || eyebrow
  const updated =
    page.show_updated && page.updated_at ? (
      <p className="m-0 text-[0.85rem] text-muted">
        Updated <time dateTime={page.updated_at}>{formatDate(page.updated_at)}</time>
      </p>
    ) : null
  if (page.layout === 'sections') {
    const sections = page.sections ?? []
    return (
      <div className={pageShell}>
        {trail}
        <PageHeader eyebrow={label} title={page.title} lead={lead} headingLevel={headingLevel}>
          {updated}
        </PageHeader>
        {before}
        {page.show_toc && sections.length > 1 ? <OnThisPage sections={sections} /> : null}
        <PageSections sections={sections} />
        {after}
        {below}
      </div>
    )
  }
  return (
    <div className={cn(pageShell, 'max-w-3xl gap-8')}>
      {trail}
      <PageHeader eyebrow={label} title={page.title} lead={lead} headingLevel={headingLevel}>
        {updated}
      </PageHeader>
      {before}
      <DocumentBody source={page.body} />
      {after}
      {below}
    </div>
  )
}

/** What's published on the site, for the blocks inside that draw it live (References, events, map places) */
const WithSiteContent = async ({ children }: { children: ReactNode }) => <SiteContentProvider content={await getSiteContent()}>{children}</SiteContentProvider>

/**
 * A page officers wrote in the dashboard: one piece of writing in a reading column, or
 * (laid out in sections) the full width with a block per section, as the site's own pages
 * are. Under the title is its subtitle, or its description when it has none, and, when the
 * page asks, the date it was updated and (in sections) a list of them. A page with a block
 * drawn live from the site gets what it draws from.
 */
export const ManagedPage: FC<ManagedPageProps> = (props) => {
  const { page } = props
  const shown = page.layout === 'sections' ? (page.sections ?? []).map((s) => s.body) : [page.body]
  return hasLiveBlock(...shown) ? (
    <WithSiteContent>
      <Content {...props} />
    </WithSiteContent>
  ) : (
    <Content {...props} />
  )
}

/** A managed page's title, description, and link-preview image, for its generateMetadata */
export const managedPageMetadata = (page: Pick<PageRow, 'title' | 'description' | 'share_image_url'> & Partial<Pick<PageRow, 'slug'>>, fallbackDescription?: string): Metadata => {
  const description = page.description ?? fallbackDescription
  // With no image of its own, a preview made from its title
  const image = page.share_image_url ?? (page.slug ? previewImagePath('page', page.slug) : null)
  const images = image ? [{ url: image }] : undefined
  return {
    title: page.title,
    description,
    openGraph: { title: page.title, description, images },
    twitter: images ? { card: 'summary_large_image', images } : undefined,
  }
}
