import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge, EmptyState } from '@/components'
import { PageHeader } from '@/globals/Page'
import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getPolls } from '@/lib/content/public'
import { isOpen } from '@/lib/content/types'

export const metadata: Metadata = { title: 'Polls and quizzes', description: 'Have your say, or test what you know about campus.' }

// New ones show up within five minutes (opening one refreshes it right away, too)
export const revalidate = 300

export default async function PollsPage() {
  const polls = await getPolls()
  return (
    <div className={cn(pageShell, 'max-w-4xl gap-[clamp(2rem,4vw,3rem)]')}>
      <PageHeader eyebrow="Polls" title="Polls and quizzes" lead="Have your say on what the club does next, or test what you know about campus." />
      {polls.length ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {polls.map((p) => (
            <li key={p.id}>
              <Link
                href={`/polls/${p.slug}`}
                className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-5 no-underline shadow-card transition-colors hover:border-brand-edge focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[1.15rem] leading-snug font-bold text-ink">{p.title}</span>
                  <Badge size="sm" tone={p.kind === 'quiz' ? 'brand' : 'neutral'}>
                    {p.kind === 'quiz' ? 'Quiz' : 'Poll'}
                  </Badge>
                  {isOpen(p) ? null : <Badge size="sm">Closed</Badge>}
                </span>
                {p.description ? <span className="text-[0.95rem] leading-relaxed text-muted">{p.description}</span> : null}
                <span className="text-[0.82rem] text-muted">
                  {p.questions.length} {p.questions.length === 1 ? 'question' : 'questions'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState bordered title="Nothing to answer right now" description="Check back soon." />
      )}
    </div>
  )
}
