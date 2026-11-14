'use client'

import { ArrowDown, ArrowLeft, ArrowUp, Copy, ExternalLink, Play, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type FC, type ReactNode } from 'react'

import { Alert, Badge, Button, useNotify } from '@/components'
import { Field, RichTextEditor, Select, SlugInput, TextArea } from '@/components/Form'
import { useInterceptNavigation } from '@/hooks/useInterceptNavigation'
import { cn } from '@/lib/cn'
import { checkSlug, deletePresentation, duplicateDocument, savePresentation } from '@/lib/dashboard/actions'
import { clearDraft, readDraft, writeDraft, type StoredDraft } from '@/lib/dashboard/draftStore'
import { formatDate } from '@/lib/dashboard/format'
import { FILE_ACCEPT, uploadFile, uploadImage } from '@/lib/dashboard/media'
import {
  PRESENTATION_DESCRIPTION_MAX,
  PRESENTATION_SLIDES_MAX,
  PRESENTATION_VISIBILITIES,
  SECTION_TITLE_MAX,
  type PresentationRow,
  type PresentationSlide,
  type PresentationVisibility,
  type PublishStatus,
} from '@/lib/supabase/types'

import { MediaPicker } from '../MediaPicker'
import { useAction } from '../ui'

/** A new, empty slide; its id keeps its editor while slides move around */
export const newSlide = (): PresentationSlide => ({ id: crypto.randomUUID(), title: '', body: '' })

const LIST = '/dashboard/presentations'
/** How long after the last change the slides are kept in this browser */
const AUTOSAVE_MS = 1000

const iconButton =
  'grid size-8 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-4'

const Card: FC<{ title: string; action?: ReactNode; children: ReactNode }> = ({ title, action, children }) => (
  <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card">
    <div className="flex items-center justify-between gap-2">
      <h2 className="m-0 text-[0.85rem] font-bold tracking-wide text-ink">{title}</h2>
      {action}
    </div>
    {children}
  </section>
)

interface PresentationEditorProps {
  doc: PresentationRow | null
}

/**
 * The editor, built once and kept through its own saves. It's rebuilt from what's saved only
 * to take in someone else's save.
 */
export const PresentationEditor: FC<PresentationEditorProps> = ({ doc }) => {
  const router = useRouter()
  const stamp = doc?.updated_at ?? ''
  const [build, setBuild] = useState<{ key: number; awaiting: string | null }>({ key: 0, awaiting: null })
  if (build.awaiting !== null && build.awaiting !== stamp) setBuild({ key: build.key + 1, awaiting: null })
  const reload = useCallback(() => {
    setBuild((b) => ({ ...b, awaiting: stamp }))
    router.refresh()
  }, [router, stamp])
  return <Editor key={build.key} doc={doc} reload={reload} />
}

/**
 * Building a slide deck: its title, web address, and a line about it, then its slides in
 * order, each with a title and its own editor. Slides move up and down, copy, and come out.
 *
 * The bar along the top says whether it's live, a draft, or has unsaved changes, and holds
 * Save draft (or Unpublish) and Publish (or Update). ⌘/Ctrl+S saves; leaving with unsaved
 * changes asks first, and they're kept in this browser in the meantime, to bring back after a
 * crash or a closed tab. Who can open it once published (anyone, anyone with the link, or
 * only officers) is set beside it.
 */
const Editor: FC<PresentationEditorProps & { reload: () => void }> = ({ doc, reload }) => {
  const router = useRouter()
  const { confirm } = useNotify()
  const { pending, errors, run } = useAction()
  const [title, setTitle] = useState(doc?.title ?? '')
  const [slug, setSlug] = useState(doc?.slug ?? '')
  const [description, setDescription] = useState(doc?.description ?? '')
  const [slides, setSlides] = useState<PresentationSlide[]>(() => (doc ? doc.slides : [newSlide()]))
  const [visibility, setVisibility] = useState<PresentationVisibility>(doc?.visibility ?? 'public')
  // Bumped to rebuild the slides' editors around restored writing: they only read their text when they start
  const [editorKey, setEditorKey] = useState(0)
  const [recovered, setRecovered] = useState<StoredDraft | null>(null)
  const draftChecked = useRef(false)
  // Which slides' editors have reported in: each puts its text in its own words, which isn't a change
  const [reported, setReported] = useState<Record<string, true>>({})
  const [newer, setNewer] = useState<{ name: string; at: string } | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const live = doc?.status === 'published'

  const snapshot = JSON.stringify({ title, slug, description, visibility, slides })
  const ready = slides.every((s) => s.id in reported)
  const [saved, setSaved] = useState<string | null>(null)
  useEffect(() => {
    if (saved === null && ready) setSaved(snapshot)
  }, [saved, ready, snapshot])
  const dirty = saved !== null && snapshot !== saved

  // What was here last time, if it never got saved
  useEffect(() => {
    if (saved === null || draftChecked.current) return
    draftChecked.current = true
    const stored = readDraft('presentation', doc?.id ?? null)
    if (stored && stored.snapshot !== saved) setRecovered(stored)
    else if (stored) clearDraft('presentation', doc?.id ?? null)
  }, [saved, doc?.id])

  // Keep the slides as they go, a moment after each change. Not while there's an older copy
  // waiting for an answer, which this would overwrite.
  useEffect(() => {
    if (!draftChecked.current || recovered) return
    if (!dirty) return clearDraft('presentation', doc?.id ?? null)
    const timer = window.setTimeout(() => writeDraft('presentation', doc?.id ?? null, snapshot), AUTOSAVE_MS)
    return () => window.clearTimeout(timer)
  }, [dirty, snapshot, recovered, doc?.id])

  const restoreDraft = () => {
    if (!recovered) return
    const s = JSON.parse(recovered.snapshot)
    setTitle(s.title ?? '')
    setSlug(s.slug ?? '')
    setDescription(s.description ?? '')
    setVisibility(s.visibility ?? 'public')
    setSlides(Array.isArray(s.slides) ? s.slides : [])
    setReported({})
    setEditorKey((k) => k + 1)
    setRecovered(null)
  }

  // Leaving with unsaved changes asks first: any link on the screen, and closing or reloading the tab
  const screenRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    screenRef.current = document.body
  }, [])
  useInterceptNavigation(screenRef, {
    shouldIntercept: dirty,
    onIntercept: async (destination) => {
      const ok = await confirm({ title: 'Leave without saving?', message: 'Your changes aren’t saved. They’re kept in this browser, and offered back the next time you open this presentation.', variant: 'warning', confirmLabel: 'Leave' })
      if (!ok) return
      writeDraft('presentation', doc?.id ?? null, snapshot)
      if (destination.origin === window.location.origin) router.push(`${destination.pathname}${destination.search}${destination.hash}`)
      else window.location.assign(destination.href)
    },
  })

  // The save this editor's slides are built on, to tell when someone else has saved since
  const loadedAt = useRef(doc?.updated_at ?? null)
  const saving = useRef(false)
  const save = (status: PublishStatus, over = false) => {
    if (saving.current) return
    saving.current = true
    const data = new FormData()
    if (loadedAt.current && !over) data.set('loaded_at', loadedAt.current)
    data.set('title', title)
    data.set('slug', slug)
    data.set('description', description)
    data.set('status', status)
    data.set('visibility', visibility)
    data.set('slides', JSON.stringify(slides))
    run(
      async () => {
        try {
          const result = await savePresentation(doc?.id ?? null, data)
          if (!result.ok && result.conflict) setNewer(result.conflict)
          return result
        } finally {
          saving.current = false
        }
      },
      (result) => {
        if (result.updatedAt) loadedAt.current = result.updatedAt
        clearDraft('presentation', doc?.id ?? null)
        setSaved(snapshot)
        setSavedAt(new Date())
        setNewer(null)
        if (!doc && result.id) router.replace(`${LIST}/${result.id}`)
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

  const patch = (id: string, change: Partial<PresentationSlide>) => setSlides((all) => all.map((s) => (s.id === id ? { ...s, ...change } : s)))
  const move = (i: number, by: -1 | 1) =>
    setSlides((all) => {
      const next = [...all]
      ;[next[i], next[i + by]] = [next[i + by], next[i]]
      return next
    })
  const copy = (i: number) => setSlides((all) => [...all.slice(0, i + 1), { ...all[i], id: crypto.randomUUID() }, ...all.slice(i + 1)])
  const full = slides.length >= PRESENTATION_SLIDES_MAX

  const lastSaved = savedAt
    ? `Saved at ${savedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : doc?.updated_at
      ? `Last saved ${formatDate(doc.updated_at, true)}`
      : 'Not saved yet'

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-4 -mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <Link href={LIST} className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-ink-soft no-underline hover:text-ink">
          <ArrowLeft size={15} aria-hidden /> Presentations
        </Link>
        <span className="flex items-center gap-2" aria-live="polite">
          {dirty ? (
            <Badge size="sm" dot tone="warning">
              Unsaved changes
            </Badge>
          ) : live ? (
            <Badge size="sm" dot tone="success">
              {doc?.visibility === 'private' ? 'Published, private' : doc?.visibility === 'unlisted' ? 'Live, unlisted' : 'Live'}
            </Badge>
          ) : (
            <Badge size="sm" dot>
              {doc ? 'Draft' : 'New draft'}
            </Badge>
          )}
          <span className="text-[0.8rem] text-muted max-sm:hidden">{lastSaved}</span>
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" loading={pending} onClick={() => save('draft')}>
            {live ? 'Unpublish' : 'Save draft'}
          </Button>
          <Button size="sm" loading={pending} onClick={() => save('published')}>
            {live ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      {newer ? (
        <Alert
          tone="warning"
          title={`${newer.name} saved this presentation at ${new Date(newer.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
          actions={
            <>
              <Button size="sm" variant="outline" onClick={reload}>
                Reload with their changes
              </Button>
              <Button size="sm" variant="ghost" loading={pending} onClick={() => save(live ? 'published' : 'draft', true)}>
                Save mine over theirs
              </Button>
            </>
          }
          onDismiss={() => setNewer(null)}
        >
          Your copy is behind theirs, so it won’t save as it is. Reload to get their changes first (what you’ve changed since your last save is kept as a draft in this browser), or save yours over theirs.
        </Alert>
      ) : null}

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
                  clearDraft('presentation', doc?.id ?? null)
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
              placeholder="Presentation title"
              aria-invalid={!!errors.title || undefined}
              aria-describedby={errors.title ? 'title-error' : undefined}
              className="field-sizing-content w-full resize-none border-0 bg-transparent p-0 text-[clamp(1.8rem,4vw,2.6rem)] leading-tight font-extrabold tracking-tight text-ink outline-none placeholder:text-ink-faint/60"
            />
            {errors.title ? (
              <p id="title-error" className="m-0 text-[0.85rem] font-semibold text-danger">
                {errors.title}
              </p>
            ) : null}
          </div>
          <Field label="Web address" error={errors.slug}>
            <SlugInput size="sm" value={slug} onValueChange={setSlug} source={title} prefix="/presentations/" locked={live} checkAvailability={(s) => checkSlug('presentation', s, doc?.id ?? null)} />
          </Field>

          <div className="flex flex-col gap-5">
            {slides.map((s, i) => (
              <section key={`${editorKey}:${s.id}`} aria-label={s.title || `Slide ${i + 1}`} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card">
                <div className="flex items-center gap-2">
                  <span className="text-[0.75rem] font-bold tracking-wide text-muted uppercase">
                    Slide {i + 1} of {slides.length}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button type="button" aria-label={`Move slide ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} className={iconButton}>
                      <ArrowUp aria-hidden />
                    </button>
                    <button type="button" aria-label={`Move slide ${i + 1} down`} disabled={i === slides.length - 1} onClick={() => move(i, 1)} className={iconButton}>
                      <ArrowDown aria-hidden />
                    </button>
                    <button type="button" aria-label={`Copy slide ${i + 1}`} disabled={full} onClick={() => copy(i)} className={iconButton}>
                      <Copy aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove slide ${i + 1}`}
                      onClick={() => setSlides((all) => all.filter((x) => x.id !== s.id))}
                      className={cn(iconButton, 'hover:bg-danger/10 hover:text-danger')}
                    >
                      <Trash2 aria-hidden />
                    </button>
                  </div>
                </div>
                <textarea
                  aria-label={`Slide ${i + 1} title`}
                  rows={1}
                  value={s.title}
                  maxLength={SECTION_TITLE_MAX}
                  onChange={(e) => patch(s.id, { title: e.target.value.replace(/\n/g, ' ') })}
                  placeholder="Slide title"
                  className="field-sizing-content w-full resize-none border-0 bg-transparent p-0 text-[1.35rem] leading-snug font-bold text-ink outline-none placeholder:text-ink-faint/60"
                />
                <RichTextEditor
                  aria-label={`Slide ${i + 1} writing`}
                  defaultValue={s.body}
                  uploadImage={uploadImage}
                  imagePicker={MediaPicker}
                  uploadFile={uploadFile}
                  fileAccept={FILE_ACCEPT}
                  minHeight="9rem"
                  placeholder="What this slide says: a few points, an image, a quote…"
                  onChange={({ json }) => {
                    patch(s.id, { body: json })
                    setReported((all) => (s.id in all ? all : { ...all, [s.id]: true }))
                  }}
                />
              </section>
            ))}
            {errors.slides ? (
              <p role="alert" className="m-0 text-[0.85rem] font-semibold text-danger">
                {errors.slides}
              </p>
            ) : null}
            {full ? (
              <p className="m-0 text-[0.85rem] text-muted">Up to {PRESENTATION_SLIDES_MAX} slides.</p>
            ) : (
              <Button variant="outline" className="self-start" leading={<Plus size={16} aria-hidden />} onClick={() => setSlides((all) => [...all, newSlide()])}>
                Add a slide
              </Button>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <Card
            title="Description"
            action={
              <span className={cn('text-[0.75rem] tabular-nums', description.length > PRESENTATION_DESCRIPTION_MAX ? 'font-semibold text-warning' : 'text-muted')}>
                {description.length}/{PRESENTATION_DESCRIPTION_MAX}
              </span>
            }
          >
            <Field label="What it’s about" error={errors.description} description="Shown in the list of presentations, in search results, and in link previews.">
              <TextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A sentence or two about it." />
            </Field>
          </Card>

          <Card title="Publishing">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[0.82rem]">
              <dt className="text-muted">Status</dt>
              <dd className="m-0 text-ink">
                {!live ? 'Draft, only officers see it' : doc?.visibility === 'private' ? 'Published for officers only' : doc?.visibility === 'unlisted' ? 'Live for anyone with the link' : 'Live on the site'}
              </dd>
              {doc?.published_at ? (
                <>
                  <dt className="text-muted">Published</dt>
                  <dd className="m-0 text-ink">{formatDate(doc.published_at)}</dd>
                </>
              ) : null}
              {doc?.author_email ? (
                <>
                  <dt className="text-muted">Author</dt>
                  <dd className="m-0 truncate text-ink">{doc.author_email.split('@')[0]}</dd>
                </>
              ) : null}
            </dl>
            <div className="flex flex-col gap-3 border-t border-line pt-3">
              <Field label="Who can see it" error={errors.visibility} description={PRESENTATION_VISIBILITIES.find((v) => v.value === visibility)?.description}>
                <Select
                  size="sm"
                  value={visibility}
                  onValueChange={(v) => setVisibility((v ?? 'public') as PresentationVisibility)}
                  options={PRESENTATION_VISIBILITIES.map(({ value, label }) => ({ value, label }))}
                />
              </Field>
            </div>
            {doc ? (
              <>
                {/* The saved version, played in the dashboard: drafts and private ones too */}
                <Button href={`${LIST}/${doc.id}/present`} size="sm" variant="outline" block leading={<Play size={14} aria-hidden />}>
                  Present
                </Button>
                {dirty ? <p className="m-0 text-[0.78rem] text-muted">Save first to present your latest changes.</p> : null}
                {live && doc.visibility !== 'private' ? (
                  <Button href={`/presentations/${doc.slug}`} size="sm" variant="outline" block external leading={<ExternalLink size={14} aria-hidden />}>
                    View on the site
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" block leading={<Copy size={14} aria-hidden />} onClick={() => run(() => duplicateDocument('presentation', doc.id), (result) => router.push(`${LIST}/${result.id}`))}>
                  Duplicate
                </Button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({ title: 'Delete this presentation?', message: 'It comes off the site right away. This can’t be undone.', variant: 'error', confirmLabel: 'Delete' })
                    if (ok) await deletePresentation(doc.id)
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-md text-[0.82rem] font-semibold text-danger hover:underline focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <Trash2 size={14} aria-hidden /> Delete presentation
                </button>
              </>
            ) : (
              <p className="m-0 text-[0.78rem] text-muted">Save it to present it.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}
