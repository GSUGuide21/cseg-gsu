'use client'

/* eslint-disable @next/next/no-img-element -- cover images can be from any site, at any size */
import { Pin } from 'lucide-react'
import Link from 'next/link'
import { useState, type FC } from 'react'

import { Badge, Button, EmptyState, Pagination, SortFilterBar, useSortFilter, type SortFilterField, type SortOption } from '@/components'
import { formatDate } from '@/lib/dashboard/format'
import { POST_CATEGORIES, postCategoryLabel, type PostRow } from '@/lib/supabase/types'

export type PostSummary = Pick<PostRow, 'slug' | 'title' | 'excerpt' | 'cover_image_url' | 'published_at' | 'category' | 'featured' | 'author_name'>

const PER_PAGE = 10

const FILTERS: SortFilterField<PostSummary>[] = [{ id: 'category', label: 'Category', value: (p) => p.category, options: POST_CATEGORIES }]
const SORTS: SortOption<PostSummary>[] = [
  { id: 'newest', label: 'Newest first', value: (p) => p.published_at, direction: 'descending' },
  { id: 'oldest', label: 'Oldest first', value: (p) => p.published_at },
  { id: 'title', label: 'Title, A to Z', value: (p) => p.title },
]
const searchable = (p: PostSummary) => [p.title, p.excerpt, p.author_name]

/** The club's posts, to browse: pinned ones first, by category, a page at a time */
export const PostList: FC<{ posts: PostSummary[] }> = ({ posts }) => {
  const list = useSortFilter({ rows: posts, filters: FILTERS, sorts: SORTS, search: searchable, syncUrl: true })
  const [page, setPage] = useState(1)

  // Pinned posts lead the usual order; picking another order means wanting that one
  const ordered = list.bar.sort === 'newest' ? [...list.rows.filter((p) => p.featured), ...list.rows.filter((p) => !p.featured)] : list.rows
  const pageCount = Math.max(1, Math.ceil(ordered.length / PER_PAGE))
  const current = Math.min(page, pageCount)
  const shown = ordered.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  return (
    <div className="flex flex-col gap-5">
      <SortFilterBar
        {...list.bar}
        aria-label="Filter posts"
        searchPlaceholder="Search posts"
        onValueChange={(v) => {
          setPage(1)
          list.bar.onValueChange(v)
        }}
        onSearchChange={(q) => {
          setPage(1)
          list.bar.onSearchChange?.(q)
        }}
      />
      {shown.length ? (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {shown.map((p) => {
            const category = postCategoryLabel(p.category)
            return (
              <li key={p.slug}>
                <Link href={`/posts/${p.slug}`} className="group flex flex-col gap-4 rounded-2xl border border-line p-5 no-underline transition-colors hover:border-brand-edge sm:flex-row">
                  {p.cover_image_url ? <img src={p.cover_image_url} alt="" className="aspect-video w-full shrink-0 rounded-xl object-cover sm:w-48" loading="lazy" /> : null}
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2 text-[0.8rem] text-muted">
                      {formatDate(p.published_at)}
                      {p.featured ? (
                        <Badge size="sm" tone="brand" icon={<Pin aria-hidden />}>
                          Pinned
                        </Badge>
                      ) : null}
                      {category ? <Badge size="sm">{category}</Badge> : null}
                    </span>
                    <span className="text-[1.2rem] font-bold text-ink group-hover:text-brand">{p.title}</span>
                    {p.excerpt ? <span className="text-[0.95rem] text-ink-soft">{p.excerpt}</span> : null}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          bordered
          title="No posts match"
          actions={
            <Button size="sm" variant="outline" onClick={list.clear}>
              Show all posts
            </Button>
          }
        />
      )}
      {pageCount > 1 ? <Pagination page={current} pageCount={pageCount} onPageChange={setPage} aria-label="Pages of posts" className="self-center" /> : null}
    </div>
  )
}
