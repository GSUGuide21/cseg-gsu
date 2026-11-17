import { FileText } from 'lucide-react'
import type { Metadata } from 'next'

import { EmptyState } from '@/components'
import { PageBlock, PageHeader } from '@/globals/Page'
import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getDocuments } from '@/lib/content/public'
import type { DocumentRow } from '@/lib/content/types'

export const metadata: Metadata = { title: 'Library', description: 'Flyers, forms, handouts, and useful links from CSEG.' }

// New documents show up within five minutes (adding one refreshes it right away, too)
export const revalidate = 300

const OTHER = 'Everything else'

export default async function LibraryPage() {
  const documents = await getDocuments()
  // Under their categories, in the order the categories first appear; ones without go last
  const groups = new Map<string, DocumentRow[]>()
  for (const d of documents) groups.set(d.category ?? OTHER, [...(groups.get(d.category ?? OTHER) ?? []), d])
  const ordered = [...groups].sort(([a], [b]) => Number(a === OTHER) - Number(b === OTHER))
  return (
    <div className={cn(pageShell, 'max-w-4xl')}>
      <PageHeader eyebrow="Library" title="Documents and links" lead="Flyers, forms, and handouts to read, print, or pass along." />
      {ordered.length ? (
        ordered.map(([category, items]) => (
          <PageBlock key={category} title={ordered.length === 1 && category === OTHER ? 'Documents' : category}>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {items.map((d) => (
                <li key={d.id}>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 no-underline shadow-card transition-colors hover:border-brand-edge focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <FileText size={20} aria-hidden className="mt-0.5 shrink-0 text-brand" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-bold text-ink">{d.title}</span>
                      {d.description ? <span className="text-[0.92rem] leading-relaxed text-muted">{d.description}</span> : null}
                      {d.file_name ? <span className="truncate text-[0.8rem] text-muted">{d.file_name}</span> : null}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </PageBlock>
        ))
      ) : (
        <EmptyState bordered title="Nothing here yet" description="Check back soon." />
      )}
    </div>
  )
}
