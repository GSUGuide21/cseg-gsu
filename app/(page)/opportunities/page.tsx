import type { Metadata } from 'next'

import { Badge, EmptyState } from '@/components'
import { PageHeader } from '@/globals/Page'
import { button, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getOpportunities } from '@/lib/content/public'
import { opportunityKindLabel } from '@/lib/content/types'
import { daysAway, formatDate } from '@/lib/dashboard/format'

export const metadata: Metadata = { title: 'Opportunities', description: 'Scholarships, jobs, internships, and volunteering passed on by CSEG.' }

// The list drops what's past its deadline; an hour is often enough for a day's change
export const revalidate = 300

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities()
  return (
    <div className={cn(pageShell, 'max-w-4xl gap-[clamp(2rem,4vw,3rem)]')}>
      <PageHeader eyebrow="Opportunities" title="Worth applying for" lead="Scholarships, jobs, internships, and volunteering we’ve come across. Each comes off this list when its deadline passes." />
      {opportunities.length ? (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {opportunities.map((o) => (
            <li key={o.id} className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-5 shadow-card">
              <span className="flex flex-wrap items-center gap-2">
                <Badge size="sm" tone="brand">
                  {opportunityKindLabel(o.kind)}
                </Badge>
                {o.deadline ? (
                  <span className="text-[0.85rem] font-semibold text-ink">
                    Apply by {formatDate(o.deadline)} <span className="font-normal text-muted">({daysAway(`${o.deadline}T12:00:00Z`)})</span>
                  </span>
                ) : null}
              </span>
              <h2 className="m-0 text-[1.2rem] leading-snug font-bold text-ink">{o.title}</h2>
              {o.organization || o.location ? <p className="m-0 text-[0.9rem] text-muted">{[o.organization, o.location].filter(Boolean).join(' · ')}</p> : null}
              {o.description ? <p className="m-0 text-[0.97rem] leading-relaxed whitespace-pre-line text-ink">{o.description}</p> : null}
              {o.url ? (
                <a href={o.url} target="_blank" rel="noopener noreferrer" className={button({ variant: 'outline', className: 'self-start' })}>
                  Find out more &rarr;
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState bordered title="Nothing open right now" description="Check back soon; we add them as we hear of them." />
      )}
    </div>
  )
}
