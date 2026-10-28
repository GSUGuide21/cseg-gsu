'use client'

/* eslint-disable @next/next/no-img-element -- cover images can be from any site, at any size */
import { ArrowLeft, Eye, ImageIcon, Trash2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FC, type ReactNode } from 'react'

import { Badge, Button, Dialog, useNotify } from '@/components'
import { Field, Input, RichTextEditor, SegmentedControl, SlugInput, TextArea, type RichTextValue } from '@/components/Form'
import { checkSlug, deletePage, deletePost, savePage, savePost } from '@/lib/dashboard/actions'
import { formatDate } from '@/lib/dashboard/format'
import { uploadImage } from '@/lib/dashboard/media'
import { DocumentBody, PageSections, plainText } from '@/lib/richtext'
import { upgradeEateriesBlocks } from '@/lib/richtext/blocks'
import { safeSrc } from '@/lib/safeUrl'
import { isSitePage, pageHref } from '@/lib/sitePages'
import { cn } from '@/lib/cn'
import { PAGE_SUBTITLE_MAX as SUBTITLE_MAX, type PageLayout, type PageRow, type PageSection, type PostRow, type PublishStatus } from '@/lib/supabase/types'

import { joinSections, newSection, SectionsEditor } from './SectionsEditor'
import { useAction } from './ui'

type Doc = Pick<PostRow, 'id' | 'title' | 'slug' | 'body' | 'status'> &
  Partial<Pick<PostRow, 'excerpt' | 'cover_image_url' | 'published_at' | 'updated_at' | 'author_email'> & Pick<PageRow, 'description' | 'subtitle' | 'layout' | 'sections' | 'updated_by'>>

const KINDS = {
  post: { save: savePost, remove: deletePost, base: '/posts', list: '/dashboard/posts', noun: 'post', plural: 'Posts' },
  page: { save: savePage, remove: deletePage, base: '/pages', list: '/dashboard/pages', noun: 'page', plural: 'Pages' },
} as const

/** What search results and link previews show at most */
const SUMMARY_MAX = 160
const WORDS_PER_MINUTE = 220

/** A sidebar card: a heading, then its contents */
const Card: FC<{ title: string; action?: ReactNode; children: ReactNode }> = ({ title, action, children }) => (
  <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
    <div className="flex items-center justify-between gap-2">
      <h2 className="m-0 text-[0.85rem] font-bold tracking-wide text-ink">{title}</h2>
      {action}
    </div>
    {children}
  </section>
)

/** The first sentence or so of the body, for a summary nobody wrote */
const firstWords = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= SUMMARY_MAX) return flat
  const cut = flat.slice(0, SUMMARY_MAX)
  const sentence = cut.match(/^.*[.!?](?=\s)/)?.[0]
  return sentence && sentence.length > 60 ? sentence : `${cut.replace(/\s+\S*$/, '')}…`
}

/**
 * Writing a post or a page, laid out like a document: a big title, its web address, and the
 * rich text editor (with the ribbon), with the details in cards beside it: the summary, the
 * cover image, how it looks in search results, and publishing.
 *
 * The bar along the top says whether it's live, a draft, or has unsaved changes, and holds
 * Preview, Save draft (or Unpublish), and Publish (or Update). ⌘/Ctrl+S saves; leaving with
 * unsaved changes asks first. Posts written in markdown before the editor open in it as
 * formatted text, and are saved in the editor's format from then on.
 */
export const DocumentEditor: FC<{
  kind: 'post' | 'page'
  doc: Doc | null
  /** A look without signing in (the dev preview): nothing is sent to the server */
  demo?: boolean
}> = ({ kind, doc, demo = false }) => {
  const k = KINDS[kind]
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const { pending, errors, run } = useAction()
  const [title, setTitle] = useState(doc?.title ?? '')
  const [slug, setSlug] = useState(doc?.slug ?? '')
  const [rich, setRich] = useState<RichTextValue | null>(null)
  const [summary, setSummary] = useState((kind === 'post' ? doc?.excerpt : doc?.description) ?? '')
  // A page's line under its title, and whether it's one piece of writing or split into sections
  const [subtitle, setSubtitle] = useState(doc?.subtitle ?? '')
  const [layout, setLayout] = useState<PageLayout>(doc?.layout ?? 'document')
  // A page in sections: each its own title, subtitle, and writing; and each one's words, once its editor reports in
  // (Old Eateries blocks come in as the References blocks they became)
  const [sections, setSections] = useState<PageSection[]>(() => (doc?.sections ?? []).map((s) => ({ ...s, body: upgradeEateriesBlocks(s.body) })))
  const [sectionText, setSectionText] = useState<Record<string, string>>({})
  // What the one-piece editor starts from; kept across a switch to sections and back
  const [bodyStart, setBodyStart] = useState(() => upgradeEateriesBlocks(doc?.body ?? ''))
  const inSections = kind === 'page' && layout === 'sections'
  /** Where it shows on the site: /posts/…, /pages/…, or a site page's own path (/about) */
  const pathOf = (s: string) => (kind === 'page' ? pageHref(s) : `${k.base}/${s}`)
  const replacesSitePage = kind === 'page' && isSitePage(slug)
  const [cover, setCover] = useState(doc?.cover_image_url ?? '')
  const [coverFailed, setCoverFailed] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState('')
  const coverFileRef = useRef<HTMLInputElement>(null)
  const [previewing, setPreviewing] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const live = doc?.status === 'published'

  // Unsaved changes: what's here now against what was last saved, taken once the editors on
  // screen have reported in (each puts the text in its own words, which isn't a change)
  const body = rich?.json ?? bodyStart
  const snapshot = JSON.stringify({ title, slug, body, summary, cover, subtitle, layout, sections })
  const ready = inSections ? sections.every((s) => s.id in sectionText) : !!rich
  const [saved, setSaved] = useState<string | null>(null)
  useEffect(() => {
    if (saved === null && ready) setSaved(snapshot)
  }, [saved, ready, snapshot])
  const dirty = saved !== null && snapshot !== saved

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = (status: PublishStatus) => {
    if (demo) return toast({ title: 'This is a preview', message: 'Saving needs an officer sign-in, in the dashboard.' })
    const data = new FormData()
    data.set('title', title)
    data.set('slug', slug)
    data.set('body', body)
    data.set('status', status)
    data.set(kind === 'post' ? 'excerpt' : 'description', summary)
    if (kind === 'post') data.set('cover_image_url', cover)
    if (kind === 'page') {
      data.set('subtitle', subtitle)
      data.set('layout', layout)
      data.set('sections', JSON.stringify(sections))
    }
    run(() => k.save(doc?.id ?? null, data), (result) => {
      setSaved(snapshot)
      setSavedAt(new Date())
      if (!doc && result.id) router.replace(`${k.list}/${result.id}`)
      else router.refresh()
    })
  }
  // ⌘/Ctrl+S: Update when it's live, Save draft otherwise
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveRef.current(live ? 'published' : 'draft')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [live])

  const uploadCover = async (file: File | undefined) => {
    if (!file) return
    setCoverUploading(true)
    setCoverError('')
    try {
      setCover(await uploadImage(file))
      setCoverFailed(false)
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : 'That image didn’t upload.')
    } finally {
      setCoverUploading(false)
    }
  }

  /**
   * Whole page ↔ sections. Each keeps its own writing; the first time over, the other
   * side's comes along (the page's writing as its first section, or the sections joined
   * into one piece, each title a heading), so switching never starts from a blank.
   */
  const switchLayout = (next: PageLayout) => {
    if (next === layout) return
    if (next === 'sections') {
      setBodyStart(body)
      if (!sections.length) setSections([newSection(body)])
    } else if (!plainText(body).trim() && sections.length) {
      setBodyStart(joinSections(sections))
      setRich(null)
    }
    setLayout(next)
  }

  const text = inSections
    ? sections.map((s) => [s.title, s.subtitle, sectionText[s.id] ?? plainText(s.body)].filter(Boolean).join('\n')).join('\n')
    : (rich?.text ?? plainText(body))
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE))
  const shownSummary = summary.trim() || firstWords(text)
  const coverSrc = cover.trim() ? safeSrc(cover) : null

  const statusBadge = dirty ? (
    <Badge size="sm" dot tone="warning">
      Unsaved changes
    </Badge>
  ) : live ? (
    <Badge size="sm" dot tone="success">
      Live
    </Badge>
  ) : (
    <Badge size="sm" dot>
      {doc ? 'Draft' : 'New draft'}
    </Badge>
  )
  const lastSaved = savedAt
    ? `Saved at ${savedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : doc?.updated_at
      ? `Last saved ${formatDate(doc.updated_at, true)}`
      : 'Not saved yet'

  return (
    <div className="flex flex-col gap-6">
      {/* What state it's in, and what to do with it, always in view */}
      <div className="sticky top-0 z-10 -mx-4 -mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <Link href={k.list} className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-ink-soft no-underline hover:text-ink">
          <ArrowLeft size={15} aria-hidden /> {k.plural}
        </Link>
        <span className="flex items-center gap-2" aria-live="polite">
          {statusBadge}
          <span className="text-[0.8rem] text-muted max-sm:hidden">{lastSaved}</span>
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" leading={<Eye size={15} aria-hidden />} onClick={() => setPreviewing(true)}>
            Preview
          </Button>
          {live ? (
            <Button size="sm" variant="outline" loading={pending} onClick={() => save('draft')}>
              Unpublish
            </Button>
          ) : (
            <Button size="sm" variant="outline" loading={pending} onClick={() => save('draft')}>
              Save draft
            </Button>
          )}
          <Button size="sm" loading={pending} onClick={() => save('published')}>
            {live ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <textarea
              aria-label="Title"
              rows={1}
              value={title}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
              placeholder={kind === 'post' ? 'Post title' : 'Page title'}
              aria-invalid={!!errors.title || undefined}
              aria-describedby={errors.title ? 'title-error' : undefined}
              className="field-sizing-content w-full resize-none border-0 bg-transparent p-0 text-[clamp(1.8rem,4vw,2.6rem)] leading-tight font-extrabold tracking-tight text-ink outline-none placeholder:text-ink-faint/60"
            />
            {errors.title ? (
              <p id="title-error" className="m-0 text-[0.85rem] font-semibold text-danger">
                {errors.title}
              </p>
            ) : null}
            {kind === 'page' ? (
              // The line under the title, typed where it shows; empty, the description stands in
              <>
                <textarea
                  aria-label="Subtitle"
                  rows={1}
                  value={subtitle}
                  maxLength={SUBTITLE_MAX}
                  onChange={(e) => setSubtitle(e.target.value.replace(/\n/g, ' '))}
                  placeholder={summary.trim() ? `${summary.trim()} (the description, until you write a subtitle)` : 'Add a subtitle'}
                  aria-invalid={!!errors.subtitle || undefined}
                  aria-describedby={errors.subtitle ? 'subtitle-error' : undefined}
                  className="field-sizing-content mt-1 w-full resize-none border-0 bg-transparent p-0 text-[clamp(1rem,1.6vw,1.15rem)] leading-[1.7] text-muted outline-none placeholder:text-ink-faint/70"
                />
                {errors.subtitle ? (
                  <p id="subtitle-error" className="m-0 text-[0.85rem] font-semibold text-danger">
                    {errors.subtitle}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
          <Field
            label="Web address"
            error={errors.slug}
            description={replacesSitePage ? `Published, this page replaces the site’s own ${pathOf(slug)} page, and shows there.` : undefined}
          >
            <SlugInput size="sm" value={slug} onValueChange={setSlug} source={title} prefix={`${k.base}/`} locked={live} checkAvailability={demo ? undefined : (s) => checkSlug(kind, s, doc?.id ?? null)} />
          </Field>
          {inSections ? (
            <SectionsEditor
              sections={sections}
              setSections={setSections}
              onText={(id, words) => setSectionText((all) => (all[id] === words ? all : { ...all, [id]: words }))}
              errors={errors}
              uploadImage={demo ? undefined : uploadImage}
            />
          ) : (
            <RichTextEditor
              aria-label="Body"
              toolbar="ribbon"
              defaultValue={bodyStart}
              onChange={setRich}
              uploadImage={demo ? undefined : uploadImage}
              minHeight="26rem"
              placeholder={kind === 'post' ? 'Tell people what happened, or what’s coming up…' : 'Write the page…'}
            />
          )}
          <p className="m-0 text-[0.8rem] text-muted tabular-nums" aria-live="off">
            {words.toLocaleString('en-US')} {words === 1 ? 'word' : 'words'} · {minutes} min read
          </p>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          {kind === 'page' ? (
            <Card title="Layout">
              <SegmentedControl
                aria-label="Layout"
                size="sm"
                fitted
                options={[
                  { value: 'document', label: 'Whole page' },
                  { value: 'sections', label: 'Sections' },
                ]}
                value={layout}
                onValueChange={(v) => switchLayout(v === 'sections' ? 'sections' : 'document')}
              />
              <p className="m-0 text-[0.78rem] text-muted">
                {layout === 'sections'
                  ? 'Full width, in sections like the club’s own pages: each with its own title, subtitle, and writing.'
                  : 'One piece of writing, in a reading column.'}{' '}
                Each layout keeps its own writing, so switching loses nothing.
              </p>
            </Card>
          ) : null}
          <Card
            title={kind === 'post' ? 'Summary' : 'Description'}
            action={
              <span className={cn('text-[0.75rem] tabular-nums', summary.length > SUMMARY_MAX ? 'font-semibold text-warning' : 'text-muted')}>
                {summary.length}/{SUMMARY_MAX}
              </span>
            }
          >
            <TextArea
              aria-label={kind === 'post' ? 'Summary' : 'Description'}
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={firstWords(text) || 'A sentence or two about it.'}
            />
            <p className="m-0 text-[0.78rem] text-muted">
              {kind === 'post' ? 'Shown in the list of posts and in link previews.' : 'Shown in search results and link previews.'} Left empty, the start of the {k.noun} is used.
            </p>
          </Card>

          {kind === 'post' ? (
            <Card
              title="Cover image"
              action={
                cover ? (
                  <button type="button" onClick={() => setCover('')} className="cursor-pointer text-[0.78rem] font-semibold text-ink-soft hover:text-danger hover:underline">
                    Remove
                  </button>
                ) : null
              }
            >
              <div className="grid aspect-video place-items-center overflow-hidden rounded-lg border border-dashed border-line bg-fill">
                {coverSrc && !coverFailed ? (
                  <img src={coverSrc} alt="" className="size-full object-cover" onError={() => setCoverFailed(true)} onLoad={() => setCoverFailed(false)} />
                ) : (
                  <span className="flex flex-col items-center gap-1.5 px-4 text-center text-[0.8rem] text-muted">
                    <ImageIcon size={22} aria-hidden />
                    {coverSrc && coverFailed ? 'That image didn’t load.' : 'No cover image'}
                  </span>
                )}
              </div>
              {demo ? null : (
                <>
                  <Button size="sm" variant="outline" block leading={<Upload size={14} aria-hidden />} loading={coverUploading} onClick={() => coverFileRef.current?.click()}>
                    Upload an image
                  </Button>
                  <input
                    ref={coverFileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      uploadCover(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                  {coverError ? (
                    <p role="alert" className="m-0 text-[0.8rem] font-semibold text-danger">
                      {coverError}
                    </p>
                  ) : null}
                </>
              )}
              <Field label="Image address" error={errors.cover_image_url}>
                <Input
                  size="sm"
                  type="url"
                  value={cover}
                  onChange={(e) => {
                    setCover(e.target.value)
                    setCoverFailed(false)
                  }}
                  placeholder="https://…"
                />
              </Field>
            </Card>
          ) : null}

          <Card title="In search results">
            {/* Roughly how a search engine or a link preview shows it */}
            <div className="flex flex-col gap-0.5 rounded-lg bg-fill p-3">
              <span className="truncate text-[0.75rem] text-success">
                cseg · {pathOf(slug || '…')}
              </span>
              <span className="line-clamp-1 text-[0.95rem] font-semibold text-brand">{title || (kind === 'post' ? 'Post title' : 'Page title')}</span>
              <span className="line-clamp-2 text-[0.8rem] text-ink-soft">{shownSummary || 'The summary shows here.'}</span>
            </div>
          </Card>

          <Card title="Publishing">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[0.82rem]">
              <dt className="text-muted">Status</dt>
              <dd className="m-0 text-ink">{live ? 'Live on the site' : 'Draft, only officers see it'}</dd>
              {doc?.published_at ? (
                <>
                  <dt className="text-muted">Published</dt>
                  <dd className="m-0 text-ink">{formatDate(doc.published_at)}</dd>
                </>
              ) : null}
              {doc?.author_email || doc?.updated_by ? (
                <>
                  <dt className="text-muted">{kind === 'post' ? 'Author' : 'Changed by'}</dt>
                  <dd className="m-0 truncate text-ink">{(doc.author_email ?? doc.updated_by ?? '').split('@')[0]}</dd>
                </>
              ) : null}
            </dl>
            {live ? (
              <Button href={pathOf(doc.slug)} size="sm" variant="outline" block external>
                View on the site
              </Button>
            ) : null}
            {doc ? (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({ title: `Delete this ${k.noun}?`, message: 'It comes off the site right away. This can’t be undone.', variant: 'error', confirmLabel: 'Delete' })
                  if (ok) await k.remove(doc.id)
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-md text-[0.82rem] font-semibold text-danger hover:underline focus-visible:outline-2 focus-visible:outline-brand"
              >
                <Trash2 size={14} aria-hidden /> Delete {k.noun}
              </button>
            ) : null}
          </Card>
        </aside>
      </div>

      <Dialog open={previewing} onClose={() => setPreviewing(false)} title="Preview" description={`How it reads at ${pathOf(slug || '…')}`} size="lg">
        <article className="flex flex-col gap-4 pb-2">
          {kind === 'post' && coverSrc && !coverFailed ? <img src={coverSrc} alt="" className="aspect-video w-full rounded-xl object-cover" /> : null}
          <h1 className="m-0 text-[1.9rem] leading-tight font-extrabold tracking-tight text-ink">{title || 'Untitled'}</h1>
          {kind === 'post' ? <p className="m-0 text-[0.85rem] text-muted">{formatDate(doc?.published_at ?? new Date().toISOString())}</p> : null}
          {kind === 'page' && (subtitle.trim() || summary.trim()) ? <p className="m-0 text-[1.05rem] leading-[1.7] text-muted">{subtitle.trim() || summary.trim()}</p> : null}
          {inSections && sections.length ? (
            <PageSections sections={sections} className="mt-4" />
          ) : !inSections && body.trim() ? (
            <DocumentBody source={body} />
          ) : (
            <p className="m-0 text-muted">Nothing written yet.</p>
          )}
        </article>
      </Dialog>
    </div>
  )
}
