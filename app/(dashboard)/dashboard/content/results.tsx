'use client'

import { ArrowLeft, Download, ExternalLink, RotateCcw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FC } from 'react'

import { ResultsBars } from '@/(page)/polls/ResultsBars'
import { ActionMenu, Button, EmptyState, Table, useNotify } from '@/components'
import { clearPollResponses, deleteFormResponses } from '@/lib/content/actions'
import type { FormResponseRow, FormRow, PollResponseRow, PollResults, PollRow } from '@/lib/content/types'
import { formatDate } from '@/lib/dashboard/format'

import { useAction } from '../ui'

const back = 'inline-flex items-center gap-1.5 self-start text-[0.85rem] font-semibold text-ink-soft no-underline hover:text-ink'
const heading = 'm-0 text-[clamp(1.5rem,3vw,1.9rem)] font-extrabold tracking-tight text-ink'

/** How a poll or quiz was answered: each question's options with how many picked them, and a quiz's marks */
export const PollResultsView: FC<{ poll: PollRow; correct: Record<string, string>; results: PollResults; responses: PollResponseRow[] }> = ({ poll, correct, results, responses }) => {
  const router = useRouter()
  const { confirm } = useNotify()
  const { pending, run } = useAction()
  const marks = responses.map((r) => r.score).filter((s): s is number => typeof s === 'number')
  const average = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : null
  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/polls" className={back}>
        <ArrowLeft size={15} aria-hidden /> Polls and quizzes
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className={heading}>{poll.title}</h1>
          <p className="m-0 text-[0.92rem] text-muted">
            {results.total} {results.total === 1 ? 'answer' : 'answers'}
            {poll.kind === 'quiz' && average !== null ? ` · average mark ${average.toFixed(1)} of ${poll.questions.length}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {poll.published ? (
            <Button href={`/polls/${poll.slug}`} size="sm" variant="outline" external leading={<ExternalLink size={14} aria-hidden />}>
              View on the site
            </Button>
          ) : null}
          {results.total ? (
            <Button
              size="sm"
              variant="outline"
              loading={pending}
              leading={<RotateCcw size={14} aria-hidden />}
              onClick={async () => {
                if (await confirm({ title: 'Clear every answer?', message: 'The counts go back to zero and everyone can answer again. This can’t be undone.', variant: 'error', confirmLabel: 'Clear' }))
                  run(() => clearPollResponses(poll.id), () => router.refresh())
              }}
            >
              Clear the answers
            </Button>
          ) : null}
        </div>
      </div>
      {poll.questions.length ? (
        <ResultsBars questions={poll.questions} results={results} correct={poll.kind === 'quiz' ? correct : undefined} />
      ) : (
        <EmptyState size="sm" title="No questions yet" description="Add some from the list of polls and quizzes." />
      )}
    </div>
  )
}

const shown = (value: string | string[] | undefined) => (Array.isArray(value) ? value.join(', ') : (value ?? ''))
const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`

/** What people sent to a form: one row each, newest first, to read, download, or remove */
export const FormResponsesView: FC<{ form: FormRow; responses: FormResponseRow[] }> = ({ form, responses }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const download = () => {
    const lines = [['Sent', ...form.fields.map((f) => f.label)], ...responses.map((r) => [formatDate(r.created_at, true), ...form.fields.map((f) => shown(r.answers[f.id]))])]
    const url = URL.createObjectURL(new Blob([lines.map((l) => l.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `${form.slug}-responses.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }
  const remove = async (ids: string[], what: string) => {
    if (!(await confirm({ title: `Remove ${what}?`, message: 'This can’t be undone.', variant: 'error', confirmLabel: 'Remove' }))) return
    const result = await deleteFormResponses(ids)
    if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
    router.refresh()
  }
  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/forms" className={back}>
        <ArrowLeft size={15} aria-hidden /> Forms
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className={heading}>{form.title}</h1>
          <p className="m-0 text-[0.92rem] text-muted">
            {responses.length} {responses.length === 1 ? 'response' : 'responses'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.published ? (
            <Button href={`/forms/${form.slug}`} size="sm" variant="outline" external leading={<ExternalLink size={14} aria-hidden />}>
              View on the site
            </Button>
          ) : null}
          {responses.length ? (
            <>
              <Button size="sm" variant="outline" leading={<Download size={14} aria-hidden />} onClick={download}>
                Download as a spreadsheet
              </Button>
              <Button size="sm" variant="outline" leading={<Trash2 size={14} aria-hidden />} onClick={() => remove(responses.map((r) => r.id), 'every response')}>
                Remove all
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <Table
        caption={`Responses to ${form.title}`}
        hideCaption
        rows={responses}
        getRowId={(r) => r.id}
        empty={<EmptyState size="sm" title="No responses yet" description={form.published ? 'Share the form’s address and they’ll show here.' : 'Open the form on the site first.'} />}
        columns={[
          { key: 'created_at', header: 'Sent', cell: (r) => formatDate(r.created_at, true) },
          ...form.fields.map((f) => ({
            key: f.id,
            header: f.label,
            label: f.label,
            cell: (r: FormResponseRow) => <span className="line-clamp-3 [overflow-wrap:anywhere] whitespace-pre-wrap">{shown(r.answers[f.id]) || <span className="text-muted">—</span>}</span>,
          })),
        ]}
        rowActions={(r) => <ActionMenu label="Actions for this response" items={[{ label: 'Remove', icon: <Trash2 />, danger: true, onSelect: () => remove([r.id], 'this response') }]} />}
      />
    </div>
  )
}
