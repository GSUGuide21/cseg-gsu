import type { FC, ReactNode } from 'react'

import { SiteContentProvider } from '@/globals/SiteContent'
import { DocumentBody, PageSections } from '@/lib/richtext'
import { hasLiveBlock } from '@/lib/richtext/blocks'
import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getSiteContent } from '@/lib/dashboard/public'
import type { PageRow } from '@/lib/supabase/types'

import { PageHeader } from '.'

type ManagedPageProps = { page: Pick<PageRow, 'title' | 'subtitle' | 'description' | 'layout' | 'sections' | 'body'>; eyebrow?: string }

const Content: FC<ManagedPageProps> = ({ page, eyebrow = 'CSEG' }) => {
  const lead = page.subtitle ?? page.description ?? undefined
  if (page.layout === 'sections')
    return (
      <div className={pageShell}>
        <PageHeader eyebrow={eyebrow} title={page.title} lead={lead} />
        <PageSections sections={page.sections ?? []} />
      </div>
    )
  return (
    <div className={cn(pageShell, 'max-w-3xl gap-8')}>
      <PageHeader eyebrow={eyebrow} title={page.title} lead={lead} />
      <DocumentBody source={page.body} />
    </div>
  )
}

/** What's published on the site, for the Eateries and References blocks inside */
const WithSiteContent = async ({ children }: { children: ReactNode }) => <SiteContentProvider content={await getSiteContent()}>{children}</SiteContentProvider>

/**
 * A page officers wrote in the dashboard: one piece of writing in a reading column, or
 * (laid out in sections) the full width with a block per section, as the site's own pages
 * are. Under the title is its subtitle, or its description when it has none. A page with a
 * block drawn live from the site (Eateries, References) gets what it draws from.
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
