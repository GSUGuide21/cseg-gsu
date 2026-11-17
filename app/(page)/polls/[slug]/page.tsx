import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/dashboard/format'
import { getPoll, getPollResults } from '@/lib/content/public'
import { isOpen } from '@/lib/content/types'

import { PollForm } from '../PollForm'
import { ResultsBars } from '../ResultsBars'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const poll = await getPoll((await params).slug)
  return poll ? { title: poll.title, description: poll.description ?? undefined } : { title: 'Not found' }
}

/** A poll or quiz to answer; once it has closed, how it came out (when it shares that) */
export default async function PollPage({ params }: Props) {
  const poll = await getPoll((await params).slug)
  if (!poll) notFound()
  const open = isOpen(poll)
  const results = !open && poll.results_public ? await getPollResults(poll.id) : null
  return (
    <article className={cn(pageShell, 'max-w-3xl gap-6')}>
      <header className="flex flex-col gap-3">
        <Link href="/polls" className={cn(inlineLink, 'text-[0.9rem]')}>
          ← All polls and quizzes
        </Link>
        <h1 className="m-0 text-[clamp(1.8rem,4.5vw,2.75rem)] leading-[1.1] font-extrabold tracking-tight text-balance text-ink">{poll.title}</h1>
        {poll.description ? <p className="m-0 text-[clamp(1rem,1.6vw,1.15rem)] leading-[1.7] text-muted">{poll.description}</p> : null}
        <p className="m-0 text-[0.9rem] text-muted">
          {poll.kind === 'quiz' ? 'A quiz' : 'A poll'} · {poll.questions.length} {poll.questions.length === 1 ? 'question' : 'questions'}
          {poll.closes_at ? ` · ${open ? 'closes' : 'closed'} ${formatDate(poll.closes_at, true)}` : ''} · one answer each
        </p>
      </header>
      {open ? (
        <PollForm pollId={poll.id} kind={poll.kind} questions={poll.questions} />
      ) : results ? (
        <>
          <p className="m-0 font-semibold text-ink">
            This has closed. {results.total} {results.total === 1 ? 'person' : 'people'} answered.
          </p>
          <ResultsBars questions={poll.questions} results={results} />
        </>
      ) : (
        <p className="m-0 text-muted">This has closed.</p>
      )}
    </article>
  )
}
