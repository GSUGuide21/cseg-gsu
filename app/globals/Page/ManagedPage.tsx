import type { Metadata } from 'next'
import type { FC, ReactNode } from 'react'

import { SiteContentProvider } from '@/globals/SiteContent'
import { DocumentBody, PageSections, sectionIds } from '@/lib/richtext'
import { hasLiveBlock } from '@/lib/richtext/blocks'
import { inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getSiteContent } from '@/lib/dashboard/public'
import { formatDate } from '@/lib/dashboard/format'
import { previewImagePath } from '@/lib/siteUrl'
import type { PageRow } from '@/lib/supabase/types'

import { PageHeader } from '.'

type ShownPage = Pick<PageRow, 'title' | 'subtitle' | 'description' | 'layout' | 'sections' | 'body'> &
  Partial<Pick<PageRow, 'eyebrow' | 'show_toc' | 'show_updated' | 'updated_at'>>

type ManagedPageProps = {
  page: ShownPage
  eyebrow?: string
  /** The site's own part that stays under what officers wrote (the Contact page's form, say) */
  after?: ReactNode
}

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

const Content: FC<ManagedPageProps> = ({ page, eyebrow = 'CSEG', after }) => {
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
        <PageHeader eyebrow={label} title={page.title} lead={lead}>
          {updated}
        </PageHeader>
        {page.show_toc && sections.length > 1 ? <OnThisPage sections={sections} /> : null}
        <PageSections sections={sections} />
        {after}
      </div>
    )
  }
  return (
    <div className={cn(pageShell, 'max-w-3xl gap-8')}>
      <PageHeader eyebrow={label} title={page.title} lead={lead}>
        {updated}
      </PageHeader>
      <DocumentBody source={page.body} />
      {after}
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
