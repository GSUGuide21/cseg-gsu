import { opportunityKindLabel } from '@/lib/content/types'
import { plainText } from '@/lib/richtext'
import type { SearchEntry } from '@/lib/search'

import { requireOfficer } from './dal'
import { formatDate } from './format'
import { listEvents } from './queries'

/**
 * What the dashboard's search looks through: everything officers keep, drafts and hidden
 * things included, each going to where it's changed. What's about people (members, join
 * requests, messages) is only for officers who can see it: an editor's search leaves it out,
 * as the database would turn it away anyway.
 */

/** A table read that a search can do without: none if it fails (a table whose migration hasn't run, say) */
const rows = <T>(result: { data: T[] | null; error: unknown }): T[] => (result.error ? [] : (result.data ?? []))

const DRAFT = { draft: 'Draft', published: 'Published' } as const
const shown = (published: boolean) => (published ? 'Shown' : 'Hidden')
const joined = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(' · ')

export async function getDashboardSearchIndex(): Promise<SearchEntry[]> {
  const { supabase, officer } = await requireOfficer()
  const staff = officer.role !== 'editor'
  // A read only an officer who sees people gets; for an editor, nothing
  const staffOnly = <T,>(read: PromiseLike<{ data: T[] | null; error: unknown }>): PromiseLike<{ data: T[] | null; error: unknown }> => (staff ? read : Promise.resolve({ data: [], error: null }))
  const [posts, pages, decks, members, requests, messages, events, albums, documents, testimonials, opportunities, polls, forms, executives, sponsors, affiliates, faqs, eateries, resources] = await Promise.all([
    supabase.from('posts').select('id, slug, title, excerpt, body, status, cover_image_url, updated_at'),
    supabase.from('pages').select('id, slug, title, description, body, layout, sections, status, share_image_url, updated_at'),
    supabase.from('presentations').select('id, slug, title, description, slides, status, visibility, updated_at'),
    staffOnly(supabase.from('members').select('id, name, email, major, year, status')),
    staffOnly(supabase.from('join_requests').select('id, name, email, major, message, status, created_at').eq('status', 'pending')),
    staffOnly(supabase.from('contact_messages').select('id, name, email, subject, body, read_at, created_at').order('created_at', { ascending: false }).limit(100)),
    listEvents().catch(() => ({ upcoming: [], past: [] })),
    supabase.from('albums').select('id, slug, title, description, taken_on, cover_url, photos, published'),
    supabase.from('documents').select('id, title, description, category, file_name, published'),
    supabase.from('testimonials').select('id, name, role, quote, photo_url, published'),
    supabase.from('opportunities').select('id, title, organization, kind, description, deadline, published'),
    supabase.from('polls').select('id, slug, kind, title, description, questions, published'),
    supabase.from('forms').select('id, slug, title, description, fields, published'),
    supabase.from('executives').select('id, first_name, last_name, role, bio, avatar_url, published'),
    supabase.from('sponsors').select('id, name, blurb, tier, logo_url, published'),
    supabase.from('affiliates').select('id, name, short_name, summary, logo_url, published'),
    supabase.from('faqs').select('id, question, answer, published'),
    supabase.from('eateries').select('id, name, address, description, status, published'),
    supabase.from('resources').select('id, label, description, href, published'),
  ])

  return [
    ...rows(posts).map((p) => ({
      title: p.title,
      href: `/dashboard/posts/${p.id}`,
      kind: 'Post',
      summary: p.excerpt,
      image: p.cover_image_url,
      date: p.updated_at,
      meta: joined(DRAFT[p.status], `/posts/${p.slug}`),
      keywords: [p.slug],
      text: plainText(p.body),
    })),
    ...rows(pages).map((p) => ({
      title: p.title,
      href: `/dashboard/pages/${p.id}`,
      kind: 'Page',
      summary: p.description,
      image: p.share_image_url,
      date: p.updated_at,
      meta: joined(DRAFT[p.status], `/${p.slug}`),
      keywords: [p.slug],
      text: p.layout === 'sections' ? p.sections.flatMap((s) => [s.title, plainText(s.body)]).join('\n') : plainText(p.body),
    })),
    ...rows(decks).map((d) => ({
      title: d.title,
      href: `/dashboard/presentations/${d.id}`,
      kind: 'Presentation',
      summary: d.description,
      date: d.updated_at,
      meta: joined(DRAFT[d.status], d.visibility !== 'public' && d.visibility, `${Array.isArray(d.slides) ? d.slides.length : 0} slides`),
      text: (Array.isArray(d.slides) ? d.slides : []).flatMap((s) => [s.title, s.label ?? '', s.label2 ?? '', plainText(s.body), plainText(s.body2 ?? '')]).join('\n'),
    })),
    ...[...events.upcoming, ...events.past].map((e) => ({
      title: e.name,
      href: `/dashboard/events/${encodeURIComponent(e.id)}`,
      kind: 'Event',
      summary: e.description,
      image: e.imageSrc,
      date: e.start,
      meta: joined(e.cancelled && 'Cancelled', formatDate(e.start, true), e.location),
    })),
    ...rows(members).map((m) => ({
      title: m.name,
      href: `/dashboard/members/${m.id}`,
      kind: 'Member',
      meta: joined(m.email, m.year, m.major, m.status !== 'active' && m.status),
      keywords: [m.email ?? '', m.major ?? ''],
    })),
    ...rows(requests).map((r) => ({
      title: r.name,
      href: '/dashboard/requests',
      kind: 'Join request',
      summary: r.message,
      date: r.created_at,
      meta: joined(r.email, r.major, `Asked ${formatDate(r.created_at)}`),
      keywords: [r.email],
    })),
    ...rows(messages).map((m) => ({
      title: m.subject || `From ${m.name}`,
      href: '/dashboard/messages',
      kind: 'Message',
      summary: m.body.slice(0, 200),
      date: m.created_at,
      meta: joined(m.read_at ? null : 'Unread', m.name, m.email),
      keywords: [m.name, m.email],
      text: m.body,
    })),
    ...rows(albums).map((a) => ({
      title: a.title,
      href: '/dashboard/albums',
      kind: 'Photos',
      summary: a.description,
      image: a.cover_url ?? a.photos[0]?.src,
      date: a.taken_on,
      meta: joined(shown(a.published), `${a.photos.length} photos`),
    })),
    ...rows(documents).map((d) => ({ title: d.title, href: '/dashboard/library', kind: 'Document', summary: d.description, meta: joined(shown(d.published), d.category, d.file_name) })),
    ...rows(opportunities).map((o) => ({
      title: o.title,
      href: '/dashboard/opportunities',
      kind: 'Opportunity',
      summary: o.description,
      meta: joined(shown(o.published), opportunityKindLabel(o.kind), o.organization, o.deadline && `Apply by ${formatDate(o.deadline)}`),
    })),
    ...rows(polls).map((p) => ({
      title: p.title,
      href: `/dashboard/polls/${p.id}`,
      kind: p.kind === 'quiz' ? 'Quiz' : 'Poll',
      summary: p.description,
      meta: joined(p.published ? 'Open' : 'Not open', `${p.questions.length} questions`),
      text: p.questions.map((q) => q.text).join('\n'),
    })),
    ...rows(forms).map((f) => ({
      title: f.title,
      href: `/dashboard/forms/${f.id}`,
      kind: 'Form',
      summary: f.description,
      meta: joined(f.published ? 'Open' : 'Not open', `/forms/${f.slug}`),
      text: f.fields.map((x) => x.label).join('\n'),
    })),
    ...rows(executives).map((x) => ({
      title: `${x.first_name} ${x.last_name}`.trim(),
      href: '/dashboard/executives',
      kind: 'Executive',
      summary: x.bio,
      image: x.avatar_url,
      meta: joined(x.role, !x.published && 'Hidden'),
    })),
    ...rows(testimonials).map((t) => ({ title: t.name, href: '/dashboard/testimonials', kind: 'Testimonial', summary: t.quote, image: t.photo_url, meta: joined(shown(t.published), t.role) })),
    ...rows(sponsors).map((x) => ({ title: x.name, href: '/dashboard/sponsors', kind: 'Sponsor', summary: x.blurb, image: x.logo_url, meta: joined(shown(x.published), x.tier) })),
    ...rows(affiliates).map((a) => ({ title: a.short_name, href: '/dashboard/affiliates', kind: 'Affiliate', summary: a.summary, image: a.logo_url, meta: joined(shown(a.published), a.name), keywords: [a.name] })),
    ...rows(faqs).map((f) => ({ title: f.question, href: '/dashboard/faqs', kind: 'Question', summary: f.answer, meta: shown(f.published) })),
    ...rows(eateries).map((e) => ({ title: e.name, href: '/dashboard/eateries', kind: 'Place to eat', summary: e.description, meta: joined(shown(e.published), e.status, e.address) })),
    ...rows(resources).map((r) => ({ title: r.label, href: '/dashboard/resources', kind: 'Resource', summary: r.description, meta: joined(shown(r.published), r.href) })),
  ]
}
