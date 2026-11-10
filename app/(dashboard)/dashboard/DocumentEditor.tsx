'use client'

/* eslint-disable @next/next/no-img-element -- cover images can be from any site, at any size */
import { AlertTriangle, ArrowLeft, Check, Copy, Eye, History, ImageIcon, Images, Info, Link2, Trash2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FC, type ReactNode } from 'react'

import { Alert, Badge, Button, Dialog, useNotify } from '@/components'
import { DateTimePicker, Field, Input, RichTextEditor, SegmentedControl, Select, SlugInput, Switch, TextArea, type RichTextValue } from '@/components/Form'
import { checkLinks, checkSlug, deletePage, deletePost, duplicateDocument, savePage, savePost } from '@/lib/dashboard/actions'
import { documentAssets, documentChecks } from '@/lib/dashboard/documentChecks'
import { clearDraft, readDraft, writeDraft, type StoredDraft } from '@/lib/dashboard/draftStore'
import { formatDate } from '@/lib/dashboard/format'
import { uploadImage } from '@/lib/dashboard/media'
import { MediaPicker } from './MediaPicker'
import { DocumentBody, PageSections, plainText, readingMinutes } from '@/lib/richtext'
import { upgradeEateriesBlocks } from '@/lib/richtext/blocks'
import { safeSrc } from '@/lib/safeUrl'
import { isSitePage, pageHref, SITE_PAGES } from '@/lib/sitePages'
import { cn } from '@/lib/cn'
import { PAGE_EYEBROW_MAX as EYEBROW_MAX, PAGE_SUBTITLE_MAX as SUBTITLE_MAX, POST_CATEGORIES, type PageLayout, type PageRow, type PageSection, type PostRow, type PublishStatus } from '@/lib/supabase/types'

import { RevisionHistory } from './RevisionHistory'
import { joinSections, newSection, SectionsEditor } from './SectionsEditor'
import { useAction } from './ui'

type Doc = Pick<PostRow, 'id' | 'title' | 'slug' | 'body' | 'status'> &
  Partial<
    Pick<PostRow, 'excerpt' | 'cover_image_url' | 'published_at' | 'updated_at' | 'author_email' | 'category' | 'featured' | 'review_requested' | 'review_note'> &
      Pick<PageRow, 'description' | 'subtitle' | 'layout' | 'sections' | 'updated_by' | 'eyebrow' | 'share_image_url' | 'show_toc' | 'show_updated' | 'publish_at' | 'unpublish_at'>
  >

const KINDS = {
  post: {
    save: savePost,
    remove: deletePost,
    base: '/posts',
    list: '/dashboard/posts',
    noun: 'post',
    plural: 'Posts',
  },
  page: {
    save: savePage,
    remove: deletePage,
    base: '/pages',
    list: '/dashboard/pages',
    noun: 'page',
    plural: 'Pages',
  },
} as const

/** What search results and link previews show at most */
const SUMMARY_MAX = 160
/** How long after the last change the writing is kept in this browser */
const AUTOSAVE_MS = 1000

/** A sidebar card: a heading, then its contents */
const Card: FC<{ title: string; action?: ReactNode; children: ReactNode }> = ({ title, action, children }) => (
  <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card">
    <div className="flex items-center justify-between gap-2">
      <h2 className="m-0 text-[0.85rem] font-bold tracking-wide text-ink">{title}</h2>
      {action}
    </div>
    {children}
  </section>
)

/** A saved time as the date-time picker holds it, on this computer's clock: "2026-11-02T09:00" */
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return null
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** The picker's time, on this computer's clock, as a moment to save */
const fromLocalInput = (local: string | null) => (local ? new Date(local).toISOString() : '')

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
 * unsaved changes asks first, and they're kept in this browser in the meantime, to bring back
 * after a crash or a closed tab. Posts written in markdown before the editor open in it as
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
  const [sections, setSections] = useState<PageSection[]>(() =>
    (doc?.sections ?? []).map((s) => ({
      ...s,
      body: upgradeEateriesBlocks(s.body),
    }))
  )
  const [sectionText, setSectionText] = useState<Record<string, string>>({})
  // What the one-piece editor starts from; kept across a switch to sections and back
  const [bodyStart, setBodyStart] = useState(() => upgradeEateriesBlocks(doc?.body ?? ''))
  const inSections = kind === 'page' && layout === 'sections'
  /** Where it shows on the site: /posts/…, /pages/…, or a site page's own path (/about) */
  const pathOf = (s: string) => (kind === 'page' ? pageHref(s) : `${k.base}/${s}`)
  const replacesSitePage = kind === 'page' && isSitePage(slug)
  // A post's cover image, or a page's link-preview image: the same picker either way
  const [cover, setCover] = useState((kind === 'post' ? doc?.cover_image_url : doc?.share_image_url) ?? '')
  // A page's label above its title, what shows under it, and when it's live
  const [eyebrow, setEyebrow] = useState(doc?.eyebrow ?? '')
  const [showToc, setShowToc] = useState(doc?.show_toc ?? false)
  const [showUpdated, setShowUpdated] = useState(doc?.show_updated ?? false)
  const [publishAt, setPublishAt] = useState<string | null>(() => toLocalInput(doc?.publish_at))
  const [unpublishAt, setUnpublishAt] = useState<string | null>(() => toLocalInput(doc?.unpublish_at))
  const [coverFailed, setCoverFailed] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverError, setCoverError] = useState('')
  const coverFileRef = useRef<HTMLInputElement>(null)
  const [previewing, setPreviewing] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [category, setCategory] = useState<string | null>(doc?.category ?? null)
  const [featured, setFeatured] = useState(doc?.featured ?? false)
  const [reviewRequested, setReviewRequested] = useState(doc?.review_requested ?? false)
  const [reviewNote, setReviewNote] = useState(doc?.review_note ?? '')
  // Bumped to rebuild the editors around restored writing: they only read their text when they start
  const [editorKey, setEditorKey] = useState(0)
  const [recovered, setRecovered] = useState<StoredDraft | null>(null)
  const draftChecked = useRef(false)
  const [brokenLinks, setBrokenLinks] = useState<string[] | null>(null)
  const [checkingLinks, setCheckingLinks] = useState(false)
  const live = doc?.status === 'published'
  // Published, but outside its window: not up yet, or already down
  const now = Date.now()
  const waiting = live && !!doc?.publish_at && Date.parse(doc.publish_at) > now
  const ended = live && !!doc?.unpublish_at && Date.parse(doc.unpublish_at) <= now

  // Unsaved changes: what's here now against what was last saved, taken once the editors on
  // screen have reported in (each puts the text in its own words, which isn't a change)
  const body = rich?.json ?? bodyStart
  const snapshot = JSON.stringify({
    title,
    slug,
    body,
    summary,
    cover,
    subtitle,
    layout,
    sections,
    eyebrow,
    showToc,
    showUpdated,
    publishAt,
    unpublishAt,
    category,
    featured,
    reviewRequested,
    reviewNote,
  })
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

  // What was here last time, if it never got saved
  useEffect(() => {
    if (demo || saved === null || draftChecked.current) return
    draftChecked.current = true
    const stored = readDraft(kind, doc?.id ?? null)
    if (stored && stored.snapshot !== saved) setRecovered(stored)
    else if (stored) clearDraft(kind, doc?.id ?? null)
  }, [demo, saved, kind, doc?.id])

  // Keep the writing as it goes, a moment after each change. Not while there's an older copy
  // waiting for an answer, which this would overwrite.
  useEffect(() => {
    if (demo || !draftChecked.current || recovered) return
    if (!dirty) return clearDraft(kind, doc?.id ?? null)
    const timer = window.setTimeout(() => writeDraft(kind, doc?.id ?? null, snapshot), AUTOSAVE_MS)
    return () => window.clearTimeout(timer)
  }, [demo, dirty, snapshot, recovered, kind, doc?.id])

  const restoreDraft = () => {
    if (!recovered) return
    const s = JSON.parse(recovered.snapshot)
    setTitle(s.title)
    setSlug(s.slug)
    setSummary(s.summary)
    setCover(s.cover)
    setSubtitle(s.subtitle)
    setLayout(s.layout)
    setSections(s.sections)
    setSectionText({})
    setEyebrow(s.eyebrow)
    setShowToc(s.showToc)
    setShowUpdated(s.showUpdated)
    setPublishAt(s.publishAt)
    setUnpublishAt(s.unpublishAt)
    setCategory(s.category ?? null)
    setFeatured(!!s.featured)
    setReviewRequested(!!s.reviewRequested)
    setReviewNote(s.reviewNote ?? '')
    setBodyStart(s.body)
    setRich(null)
    setEditorKey((k) => k + 1)
    setRecovered(null)
  }

  const save = (status: PublishStatus) => {
    if (demo)
      return toast({
        title: 'This is a preview',
        message: 'Saving needs an officer sign-in, in the dashboard.',
      })
    const data = new FormData()
    data.set('title', title)
    data.set('slug', slug)
    data.set('body', body)
    data.set('status', status)
    data.set(kind === 'post' ? 'excerpt' : 'description', summary)
    data.set('publish_at', fromLocalInput(publishAt))
    data.set('unpublish_at', fromLocalInput(unpublishAt))
    if (reviewRequested) data.set('review_requested', 'on')
    data.set('review_note', reviewNote)
    if (kind === 'post') {
      data.set('cover_image_url', cover)
      data.set('category', category ?? '')
      if (featured) data.set('featured', 'on')
    }
    if (kind === 'page') {
      data.set('share_image_url', cover)
      data.set('eyebrow', eyebrow)
      if (showToc) data.set('show_toc', 'on')
      if (showUpdated) data.set('show_updated', 'on')
      data.set('subtitle', subtitle)
      data.set('layout', layout)
      data.set('sections', JSON.stringify(sections))
    }
    run(
      () => k.save(doc?.id ?? null, data),
      (result) => {
        clearDraft(kind, doc?.id ?? null)
        setSaved(snapshot)
        setSavedAt(new Date())
        if (status === 'published') {
          setReviewRequested(false)
          setReviewNote('')
        }
        if (!doc && result.id) router.replace(`${k.list}/${result.id}`)
        else router.refresh()
      }
    )
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

  const [pickingCover, setPickingCover] = useState(false)
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

  const text = inSections ? sections.map((s) => [s.title, s.subtitle, sectionText[s.id] ?? plainText(s.body)].filter(Boolean).join('\n')).join('\n') : (rich?.text ?? plainText(body))
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const minutes = readingMinutes(text)
  const shownSummary = summary.trim() || firstWords(text)
  const coverSrc = cover.trim() ? safeSrc(cover) : null
  const bodies = inSections ? sections.map((s) => s.body) : [body]
  const checks = documentChecks({ kind, title, summary, cover, category, words, bodies })
  const links = documentAssets(bodies).links.filter((l) => /^https?:/.test(l))
  const runLinkCheck = async () => {
    setCheckingLinks(true)
    setBrokenLinks(await checkLinks(links).catch(() => null))
    setCheckingLinks(false)
  }

  const statusBadge = dirty ? (
    <Badge size="sm" dot tone="warning">
      Unsaved changes
    </Badge>
  ) : waiting ? (
    <Badge size="sm" dot tone="info">
      Scheduled
    </Badge>
  ) : ended ? (
    <Badge size="sm" dot>
      Ended
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
            {live ? 'Update' : publishAt && Date.parse(publishAt) > now ? 'Schedule' : 'Publish'}
          </Button>
        </div>
      </div>

      {recovered ? (
        <Alert
          tone="info"
          title="You have unsaved work here"
          actions={
            <>
              <Button size="sm" onClick={restoreDraft}>
                Restore it
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  clearDraft(kind, doc?.id ?? null)
                  setRecovered(null)
                }}
              >
                Discard it
              </Button>
            </>
          }
        >
          From {formatDate(new Date(recovered.savedAt).toISOString(), true)}, in this browser.
          {doc?.updated_at && Date.parse(doc.updated_at) > recovered.savedAt ? ' This was saved again since then, so restoring replaces the newer version.' : ''}
        </Alert>
      ) : null}

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
          <Field label="Web address" error={errors.slug} description={replacesSitePage ? `Published, this page replaces the site’s own ${pathOf(slug)} page, and shows there.` : undefined}>
            <SlugInput
              size="sm"
              value={slug}
              onValueChange={setSlug}
              source={title}
              prefix={`${k.base}/`}
              locked={live}
              checkAvailability={demo ? undefined : (s) => checkSlug(kind, s, doc?.id ?? null)}
            />
          </Field>
          {inSections ? (
            <SectionsEditor
              key={editorKey}
              sections={sections}
              setSections={setSections}
              onText={(id, words) => setSectionText((all) => (all[id] === words ? all : { ...all, [id]: words }))}
              errors={errors}
              uploadImage={demo ? undefined : uploadImage}
              imagePicker={demo ? undefined : MediaPicker}
            />
          ) : (
            <RichTextEditor
              key={editorKey}
              aria-label="Body"
              toolbar="ribbon"
              defaultValue={bodyStart}
              onChange={setRich}
              uploadImage={demo ? undefined : uploadImage}
              imagePicker={demo ? undefined : MediaPicker}
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
                {layout === 'sections' ? 'Full width, in sections like the club’s own pages: each with its own title, subtitle, and writing.' : 'One piece of writing, in a reading column.'} Each
                layout keeps its own writing, so switching loses nothing.
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

          {kind === 'page' ? (
            <Card title="Appearance">
              <Field label="Label above the title" error={errors.eyebrow} description="The small line over the title.">
                <Input size="sm" value={eyebrow} maxLength={EYEBROW_MAX} onChange={(e) => setEyebrow(e.target.value)} placeholder={isSitePage(slug) ? SITE_PAGES[slug].eyebrow : 'CSEG'} />
              </Field>
              <Switch size="sm" checked={showUpdated} onCheckedChange={setShowUpdated} description="Under the title, from when it was last saved.">
                Show the date it was updated
              </Switch>
              <Switch
                size="sm"
                checked={showToc}
                onCheckedChange={setShowToc}
                disabled={!inSections}
                description={inSections ? 'A list of the sections under the title, each a link to it.' : 'For pages laid out in sections.'}
              >
                “On this page” list
              </Switch>
            </Card>
          ) : null}

          <Card
            title={kind === 'post' ? 'Cover image' : 'Share image'}
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
                  {coverSrc && coverFailed ? 'That image didn’t load.' : kind === 'post' ? 'No cover image' : 'No share image'}
                </span>
              )}
            </div>
            {demo ? null : (
              <>
                <Button size="sm" variant="outline" block leading={<Upload size={14} aria-hidden />} loading={coverUploading} onClick={() => coverFileRef.current?.click()}>
                  Upload an image
                </Button>
                <Button size="sm" variant="ghost" block leading={<Images size={14} aria-hidden />} onClick={() => setPickingCover(true)}>
                  Choose from the library
                </Button>
                <MediaPicker
                  open={pickingCover}
                  onClose={() => setPickingCover(false)}
                  onPick={(src) => {
                    setCover(src)
                    setCoverFailed(false)
                  }}
                />
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
            {kind === 'page' ? <p className="m-0 text-[0.78rem] text-muted">Shown when the page is shared on social media or in a text. About 1200 × 630 works best.</p> : null}
            <Field label="Image address" error={kind === 'post' ? errors.cover_image_url : errors.share_image_url}>
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

          {kind === 'post' ? (
            <Card title="On the site">
              <Field label="Category" error={errors.category}>
                <Select size="sm" value={category ?? ''} onValueChange={(v) => setCategory(v || null)} options={[{ value: '', label: 'None' }, ...POST_CATEGORIES]} />
              </Field>
              <Switch size="sm" checked={featured} onCheckedChange={setFeatured} description="Keeps it at the top of the posts list.">
                Pin this post
              </Switch>
            </Card>
          ) : null}

          <Card title="In search results">
            {/* Roughly how a search engine or a link preview shows it */}
            <div className="flex flex-col gap-0.5 rounded-lg bg-fill p-3">
              <span className="truncate text-[0.75rem] text-success">cseg · {pathOf(slug || '…')}</span>
              <span className="line-clamp-1 text-[0.95rem] font-semibold text-brand">{title || (kind === 'post' ? 'Post title' : 'Page title')}</span>
              <span className="line-clamp-2 text-[0.8rem] text-ink-soft">{shownSummary || 'The summary shows here.'}</span>
            </div>
          </Card>

          <Card title="Before publishing">
            {checks.length ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[0.8rem]">
                {checks.map((c) => (
                  <li key={c.id} className="flex gap-2 text-ink-soft">
                    {c.tone === 'warning' ? <AlertTriangle size={14} aria-label="Worth fixing" className="mt-0.5 shrink-0 text-warning" /> : <Info size={14} aria-label="Good to know" className="mt-0.5 shrink-0 text-muted" />}
                    {c.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 flex items-center gap-2 text-[0.8rem] text-ink-soft">
                <Check size={14} aria-hidden className="text-success" /> Looks ready.
              </p>
            )}
            {links.length && !demo ? (
              <>
                <Button size="sm" variant="outline" block leading={<Link2 size={14} aria-hidden />} loading={checkingLinks} onClick={runLinkCheck}>
                  Check {links.length === 1 ? 'the link' : `${links.length} links`}
                </Button>
                {brokenLinks ? (
                  brokenLinks.length ? (
                    <div role="status" className="flex flex-col gap-1 text-[0.8rem] text-danger">
                      <p className="m-0 font-semibold">{brokenLinks.length === 1 ? 'This link looks broken:' : 'These links look broken:'}</p>
                      {brokenLinks.map((l) => (
                        <span key={l} className="[overflow-wrap:anywhere]">
                          {l}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p role="status" className="m-0 text-[0.8rem] text-ink-soft">
                      No broken links found.
                    </p>
                  )
                ) : null}
              </>
            ) : null}
          </Card>

          <Card title="Publishing">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[0.82rem]">
              <dt className="text-muted">Status</dt>
              <dd className="m-0 text-ink">
                {waiting ? `Goes live ${formatDate(doc?.publish_at, true)}` : ended ? 'Its time is up; only officers see it' : live ? 'Live on the site' : 'Draft, only officers see it'}
              </dd>
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
            {!live ? (
              <div className="flex flex-col gap-3 border-t border-line pt-3">
                <Switch size="sm" checked={reviewRequested} onCheckedChange={setReviewRequested} description="Marks it for another officer in the list. Publishing clears this.">
                  Ready for review
                </Switch>
                {reviewRequested ? <TextArea aria-label="Note for the reviewer" rows={2} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Anything to look at in particular?" /> : null}
              </div>
            ) : null}
            <div className="flex flex-col gap-3 border-t border-line pt-3">
                <Field label="Goes live" error={errors.publish_at} description="Blank: as soon as it’s published.">
                  <DateTimePicker size="sm" value={publishAt} onValueChange={setPublishAt} />
                </Field>
                <Field label="Comes down" error={errors.unpublish_at} description="Blank: it stays up.">
                  <DateTimePicker size="sm" value={unpublishAt} onValueChange={setUnpublishAt} />
                </Field>
                {publishAt || unpublishAt ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPublishAt(null)
                      setUnpublishAt(null)
                    }}
                    className="cursor-pointer self-start text-[0.78rem] font-semibold text-ink-soft hover:underline"
                  >
                    Clear the schedule
                  </button>
                ) : null}
            </div>
            {live && !waiting && !ended ? (
              <Button href={pathOf(doc.slug)} size="sm" variant="outline" block external>
                View on the site
              </Button>
            ) : null}
            {doc && !demo ? (
              <>
                {/* The saved version, at its own address, with the site around it */}
                <Button href={`/dashboard/preview?kind=${kind}&id=${doc.id}`} size="sm" variant="outline" block leading={<Eye size={14} aria-hidden />} target="_blank" rel="noopener">
                  Preview on the site
                </Button>
                {dirty ? <p className="m-0 text-[0.78rem] text-muted">Save first to see your latest changes there.</p> : null}
                <Button size="sm" variant="outline" block leading={<History size={14} aria-hidden />} onClick={() => setHistoryOpen(true)}>
                  History
                </Button>
                <Button size="sm" variant="outline" block leading={<Copy size={14} aria-hidden />} onClick={() => run(() => duplicateDocument(kind, doc.id), (result) => router.push(`${k.list}/${result.id}`))}>
                  Duplicate
                </Button>
              </>
            ) : null}
            {doc ? (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: `Delete this ${k.noun}?`,
                    message: 'It comes off the site right away. This can’t be undone.',
                    variant: 'error',
                    confirmLabel: 'Delete',
                  })
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

      {doc && !demo ? <RevisionHistory kind={kind} docId={doc.id} open={historyOpen} onClose={() => setHistoryOpen(false)} dirty={dirty} /> : null}

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
