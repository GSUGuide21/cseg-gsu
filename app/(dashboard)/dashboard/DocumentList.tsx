'use client'

import { Copy, ExternalLink, FileText, Newspaper, Pencil, Pin, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FC } from 'react'

import { ActionMenu, Badge, Button, EmptyState, SortFilterBar, Table, useSortFilter, type SortFilterField, type SortOption, type Tone } from '@/components'
import { duplicateDocument } from '@/lib/dashboard/actions'
import { formatDate } from '@/lib/dashboard/format'
import { POST_CATEGORIES, postCategoryLabel, type PublishStatus } from '@/lib/supabase/types'

import { PageTitle, useAction } from './ui'

export interface DocumentSummary {
  id: string
  slug: string
  title: string
  status: PublishStatus
  updated_at: string
  published_at?: string | null
  /** Published, it shows only between these */
  publish_at?: string | null
  unpublish_at?: string | null
  /** Who wrote it (posts) or last changed it (pages) */
  by?: string | null
  category?: string | null
  featured?: boolean
  review_requested?: boolean
  review_note?: string | null
}

const COPY = {
  post: { title: 'Posts', description: 'News and announcements, listed at /posts on the site.', base: '/posts', list: '/dashboard/posts', create: 'Write a post', icon: <Newspaper /> },
  page: { title: 'Pages', description: 'Standalone pages on the site, each at its own address (/guide): a constitution, an FAQ, a sign-up guide. A page can sit under another, and be listed in the menu.', base: '', list: '/dashboard/pages', create: 'Create a page', icon: <FileText /> },
} as const

type DocumentState = 'draft' | 'review' | 'live' | 'scheduled' | 'ended'

const STATES: Record<DocumentState, { word: string; tone: Tone }> = {
  review: { word: 'Needs review', tone: 'warning' },
  draft: { word: 'Draft', tone: 'neutral' },
  scheduled: { word: 'Scheduled', tone: 'info' },
  live: { word: 'Published', tone: 'success' },
  ended: { word: 'Ended', tone: 'neutral' },
}

/** Where it stands right now: a published one may be outside its window, not up yet or already down */
const stateOf = (d: DocumentSummary): DocumentState => {
  if (d.status !== 'published') return d.review_requested ? 'review' : 'draft'
  const now = Date.now()
  if (d.publish_at && Date.parse(d.publish_at) > now) return 'scheduled'
  return d.unpublish_at && Date.parse(d.unpublish_at) <= now ? 'ended' : 'live'
}

const person = (email: string | null | undefined) => email?.split('@')[0]

const searchable = (d: DocumentSummary) => [d.title, d.slug]

const FILTERS: SortFilterField<DocumentSummary>[] = [
  { id: 'state', label: 'Status', value: stateOf, options: (Object.keys(STATES) as DocumentState[]).map((s) => ({ value: s, label: STATES[s].word })) },
  { id: 'by', label: 'Who', value: (d) => person(d.by) },
]
const POST_FILTERS: SortFilterField<DocumentSummary>[] = [...FILTERS, { id: 'category', label: 'Category', value: (d) => d.category, options: POST_CATEGORIES }]

const SORTS: SortOption<DocumentSummary>[] = [
  { id: 'updated', label: 'Recently updated', value: (d) => d.updated_at, direction: 'descending' },
  { id: 'oldest', label: 'Least recently updated', value: (d) => d.updated_at },
  { id: 'title', label: 'Title, A to Z', value: (d) => d.title },
  { id: 'scheduled', label: 'Next to go live', value: (d) => (stateOf(d) === 'scheduled' ? d.publish_at : null) },
]

/** Posts or pages, told apart by where they stand, to sort and narrow down */
export const DocumentList: FC<{ kind: 'post' | 'page'; docs: DocumentSummary[] }> = ({ kind, docs }) => {
  const c = COPY[kind]
  const router = useRouter()
  const { run } = useAction()
  const list = useSortFilter({ rows: docs, filters: kind === 'post' ? POST_FILTERS : FILTERS, sorts: SORTS, search: searchable, syncUrl: true })
  return (
    <>
      <PageTitle
        icon={c.icon}
        title={c.title}
        description={c.description}
        actions={
          <Button href={`${c.list}/new`} size="sm" leading={<Plus size={15} aria-hidden />}>
            {c.create}
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        <SortFilterBar {...list.bar} searchPlaceholder={`Search ${c.title.toLowerCase()}`} />
        <Table
          caption={`All ${c.title.toLowerCase()}`}
          titleBar
          columnMenu
          rows={list.rows}
          getRowId={(d) => d.id}
          empty={
            <EmptyState
              size="sm"
              icon={c.icon}
              title={docs.length ? 'Nothing matches' : `No ${c.title.toLowerCase()} yet`}
              actions={
                docs.length ? (
                  <Button size="sm" variant="outline" onClick={list.clear}>
                    Clear filters
                  </Button>
                ) : (
                  <Button href={`${c.list}/new`} size="sm">
                    {c.create}
                  </Button>
                )
              }
            />
          }
          columns={[
            {
              key: 'title',
              header: 'Title',
              cell: (d) => (
                <span className="flex min-w-0 flex-col">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {d.featured ? <Pin size={13} aria-label="Pinned" className="shrink-0 text-brand" /> : null}
                    <Link href={`${c.list}/${d.id}`} className="truncate text-ink no-underline hover:text-brand hover:underline">
                      {d.title}
                    </Link>
                  </span>
                  <span className="truncate text-[0.8rem] font-normal text-muted">
                    {c.base}/{d.slug}
                  </span>
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              groupable: true,
              groupValue: (d) => STATES[stateOf(d)].word,
              cell: (d) => {
                const state = stateOf(d)
                return (
                  <span className="flex flex-col items-start gap-1" title={d.review_note ?? undefined}>
                    <Badge size="sm" dot tone={STATES[state].tone}>
                      {state === 'scheduled' ? `Scheduled for ${formatDate(d.publish_at, true)}` : STATES[state].word}
                    </Badge>
                  </span>
                )
              },
            },
            ...(kind === 'post' ? [{ key: 'category', header: 'Category', hideWhenStacked: true, groupable: true, groupValue: (d: DocumentSummary) => postCategoryLabel(d.category), cell: (d: DocumentSummary) => postCategoryLabel(d.category) ?? '—' }] : []),
            { key: 'updated_at', header: 'Updated', cell: (d) => formatDate(d.updated_at) },
            { key: 'by', header: kind === 'post' ? 'Author' : 'Changed by', hideWhenStacked: true, groupable: true, groupValue: (d) => person(d.by), cell: (d) => person(d.by) ?? '—' },
          ]}
          rowActions={(d) => (
            <ActionMenu
              label={`Actions for ${d.title}`}
              items={[
                { label: 'Edit', icon: <Pencil />, href: `${c.list}/${d.id}` },
                { label: 'Duplicate', icon: <Copy />, onSelect: () => run(() => duplicateDocument(kind, d.id), (result) => router.push(`${c.list}/${result.id}`)) },
                ...(stateOf(d) === 'live' ? [{ label: 'View on the site', icon: <ExternalLink />, href: `${c.base}/${d.slug}` }] : []),
              ]}
            />
          )}
        />
      </div>
    </>
  )
}
