'use client'

import { ExternalLink, FileText, Newspaper, Pencil, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState, type FC } from 'react'

import { ActionMenu, Badge, Button, EmptyState, FilterBar, Table, type FilterValues } from '@/components'
import { formatDate } from '@/lib/dashboard/format'
import type { PublishStatus } from '@/lib/supabase/types'

import { PageTitle } from './ui'

export interface DocumentSummary {
  id: string
  slug: string
  title: string
  status: PublishStatus
  updated_at: string
  published_at?: string | null
  /** Who wrote it (posts) or last changed it (pages) */
  by?: string | null
}

const COPY = {
  post: { title: 'Posts', description: 'News and announcements, listed at /posts on the site.', base: '/posts', list: '/dashboard/posts', create: 'Write a post', icon: <Newspaper /> },
  page: { title: 'Pages', description: 'Standalone pages on the site, at /pages/…: a constitution, an FAQ, a sign-up guide.', base: '/pages', list: '/dashboard/pages', create: 'Create a page', icon: <FileText /> },
} as const

/** Posts or pages, with drafts and published ones told apart */
export const DocumentList: FC<{ kind: 'post' | 'page'; docs: DocumentSummary[] }> = ({ kind, docs }) => {
  const c = COPY[kind]
  const [filters, setFilters] = useState<FilterValues>({})
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rows = docs.filter((d) => (!filters.status?.length || filters.status.includes(d.status)) && (!q || d.title.toLowerCase().includes(q)))
  return (
    <>
      <PageTitle
        title={c.title}
        description={c.description}
        actions={
          <Button href={`${c.list}/new`} size="sm" leading={<Plus size={15} aria-hidden />}>
            {c.create}
          </Button>
        }
      />
      <div className="flex flex-col gap-4">
        <FilterBar
          filters={[
            {
              id: 'status',
              label: 'Status',
              options: [
                { value: 'published', label: 'Published', count: docs.filter((d) => d.status === 'published').length },
                { value: 'draft', label: 'Draft', count: docs.filter((d) => d.status === 'draft').length },
              ],
            },
          ]}
          value={filters}
          onValueChange={setFilters}
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder={`Search ${c.title.toLowerCase()}`}
          resultCount={rows.length}
        />
        <Table
          caption={c.title}
          hideCaption
          rows={rows}
          getRowId={(d) => d.id}
          defaultSort={{ key: 'updated_at', direction: 'descending' }}
          empty={
            <EmptyState
              size="sm"
              icon={c.icon}
              title={docs.length ? 'Nothing matches' : `No ${c.title.toLowerCase()} yet`}
              actions={
                docs.length ? null : (
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
              sortable: true,
              cell: (d) => (
                <span className="flex min-w-0 flex-col">
                  <Link href={`${c.list}/${d.id}`} className="truncate text-ink no-underline hover:text-brand hover:underline">
                    {d.title}
                  </Link>
                  <span className="truncate text-[0.8rem] font-normal text-muted">
                    {c.base}/{d.slug}
                  </span>
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              cell: (d) => (
                <Badge size="sm" dot tone={d.status === 'published' ? 'success' : 'neutral'}>
                  {d.status === 'published' ? 'Published' : 'Draft'}
                </Badge>
              ),
            },
            { key: 'updated_at', header: 'Updated', sortable: true, cell: (d) => formatDate(d.updated_at) },
            { key: 'by', header: kind === 'post' ? 'Author' : 'Changed by', hideWhenStacked: true, cell: (d) => d.by?.split('@')[0] ?? '—' },
          ]}
          rowActions={(d) => (
            <ActionMenu
              label={`Actions for ${d.title}`}
              items={[
                { label: 'Edit', icon: <Pencil />, href: `${c.list}/${d.id}` },
                ...(d.status === 'published' ? [{ label: 'View on the site', icon: <ExternalLink />, href: `${c.base}/${d.slug}` }] : []),
              ]}
            />
          )}
        />
      </div>
    </>
  )
}
