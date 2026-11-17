'use client'

import { ArrowDown, ArrowLeft, ArrowUp, Copy, ExternalLink, Eye, EyeOff, History, Images, Play, Plus, Printer, Trash2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type FC, type ReactNode } from 'react'

import { Alert, Badge, Button, useNotify } from '@/components'
import { DateTimePicker, Field, Input, RichTextEditor, Select, Sortable, SortableHandle, SlugInput, TextArea } from '@/components/Form'
import { useInterceptNavigation } from '@/hooks/useInterceptNavigation'
import { cn } from '@/lib/cn'
import { checkSlug, deletePresentation, duplicateDocument, savePresentation } from '@/lib/dashboard/actions'
import { clearDraft, readDraft, writeDraft, type StoredDraft } from '@/lib/dashboard/draftStore'
import { atlantaToIso, formatDate, isoToAtlanta } from '@/lib/dashboard/format'
import { FILE_ACCEPT, uploadFile, uploadImage } from '@/lib/dashboard/media'
import { DECK_AUTOPLAY, DECK_THEMES, DECK_TRANSITIONS, deckSettings, SLIDE_LAYOUTS, usesImage } from '@/lib/presentations'
import { DocumentBody } from '@/lib/richtext'
import { SlideView, themeClass } from '@/(page)/presentations/Deck'
import {
  PRESENTATION_DESCRIPTION_MAX,
  PRESENTATION_NOTES_MAX,
  PRESENTATION_SLIDES_MAX,
  PRESENTATION_VISIBILITIES,
  SECTION_TITLE_MAX,
  type PresentationRow,
  type PresentationSettings,
  type SlideLayout,
  type PresentationSlide,
  type PresentationVisibility,
  type PublishStatus,
} from '@/lib/supabase/types'

import { MediaPicker } from '../MediaPicker'
import { RevisionHistory } from '../RevisionHistory'
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

/**
 * A slide's writing. Its editor puts the text in its own words when it starts, which isn't a
 * change, so the first thing it reports is marked as such.
 */
const SlideWriting: FC<{ slide: PresentationSlide; label: string; onBody: (json: string, first: boolean) => void }> = ({ slide, label, onBody }) => {
  const first = useRef(true)
  return (
    <RichTextEditor
      aria-label={label}
      defaultValue={slide.body}
      uploadImage={uploadImage}
      imagePicker={MediaPicker}
      uploadFile={uploadFile}
      fileAccept={FILE_ACCEPT}
      minHeight="9rem"
      placeholder="What this slide says: a few points, an image, a quote…"
      onChange={({ json }) => {
        const wasFirst = first.current
        first.current = false
        onBody(json, wasFirst)
      }}
    />
  )
}

/** What's saved, with one slide's writing swapped for the editor's own wording of the same thing */
const rebase = (snapshot: string, id: string, before: string, after: string) => {
  const snap = JSON.parse(snapshot) as { slides?: PresentationSlide[] }
  const slide = snap.slides?.find((x) => x.id === id)
  if (!slide || slide.body !== before) return snapshot
  slide.body = after
  return JSON.stringify(snap)
}

interface PresentationEditorProps {
  doc: PresentationRow | null
  /** Each slide's speaker notes, by slide id (officers only; they're kept apart from the slides) */
  notes?: Record<string, string>
  /** A look without signing in (the dev preview): nothing is sent to the server */
  demo?: boolean
}

/**
 * The editor, built once and kept through its own saves. It's rebuilt from what's saved only
 * to take in someone else's save.
 */
export const PresentationEditor: FC<PresentationEditorProps> = ({ doc, notes, demo }) => {
  const router = useRouter()
  const stamp = doc?.updated_at ?? ''
  const [build, setBuild] = useState<{ key: number; awaiting: string | null }>({ key: 0, awaiting: null })
  if (build.awaiting !== null && build.awaiting !== stamp) setBuild({ key: build.key + 1, awaiting: null })
  const reload = useCallback(() => {
    setBuild((b) => ({ ...b, awaiting: stamp }))
    router.refresh()
  }, [router, stamp])
  return <Editor key={build.key} doc={doc} notes={notes} demo={demo} reload={reload} />
}

/**
 * Building a slide deck: its title, web address, and a line about it, then its slides, laid
 * out as a presentation program does: the slides in order down the side (drag to reorder),
 * and the one picked beside them, with how it will look, its layout, title, picture, writing,
 * and speaker notes. Slides copy, hide from the show, and come out. The deck's theme, the way
 * slides arrive, and playing by itself are set under Design.
 *
 * The bar along the top says whether it's live, a draft, or has unsaved changes, and holds
 * Save draft (or Unpublish) and Publish (or Update). ⌘/Ctrl+S saves; leaving with unsaved
 * changes asks first, and they're kept in this browser in the meantime, to bring back after a
 * crash or a closed tab. Who can open it once published (anyone, anyone with the link, or
 * only officers) is set beside it.
 */
const Editor: FC<PresentationEditorProps & { reload: () => void }> = ({ doc, notes: savedNotes, demo = false, reload }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const { pending, errors, run } = useAction()
  const [title, setTitle] = useState(doc?.title ?? '')
  const [slug, setSlug] = useState(doc?.slug ?? '')
  const [description, setDescription] = useState(doc?.description ?? '')
  const [slides, setSlides] = useState<PresentationSlide[]>(() => (doc ? doc.slides : [newSlide()]))
  const [visibility, setVisibility] = useState<PresentationVisibility>(doc?.visibility ?? 'public')
  const [notes, setNotes] = useState<Record<string, string>>(savedNotes ?? {})
  // When it's up, on Atlanta's clock
  const [publishAt, setPublishAt] = useState<string | null>(() => isoToAtlanta(doc?.publish_at))
  const [unpublishAt, setUnpublishAt] = useState<string | null>(() => isoToAtlanta(doc?.unpublish_at))
  const [historyOpen, setHistoryOpen] = useState(false)
  // Bumped to rebuild the slides' editors around restored writing: they only read their text when they start
  const [editorKey, setEditorKey] = useState(0)
  const [recovered, setRecovered] = useState<StoredDraft | null>(null)
  const draftChecked = useRef(false)
  // The deck's theme, how slides arrive, and whether it plays by itself
  const [settings, setSettings] = useState<PresentationSettings>(() => deckSettings(doc?.settings))
  // The slide being edited
  const [selectedId, setSelectedId] = useState<string | null>(() => slides[0]?.id ?? null)
  const [pickingImage, setPickingImage] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const imageFile = useRef<HTMLInputElement>(null)
  const [newer, setNewer] = useState<{ name: string; at: string } | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const live = doc?.status === 'published'
  // Published, but outside its window: not up yet, or already down
  const now = Date.now()
  const waiting = live && !!doc?.publish_at && Date.parse(doc.publish_at) > now
  const ended = live && !!doc?.unpublish_at && Date.parse(doc.unpublish_at) <= now

  // Unsaved changes: what's here now against what was last saved
  const snapshot = JSON.stringify({ title, slug, description, visibility, publishAt, unpublishAt, settings, slides, notes })
  const [saved, setSaved] = useState(snapshot)
  const dirty = snapshot !== saved

  // What was here last time, if it never got saved
  useEffect(() => {
    if (demo || draftChecked.current) return
    draftChecked.current = true
    const stored = readDraft('presentation', doc?.id ?? null)
    if (stored && stored.snapshot !== saved) setRecovered(stored)
    else if (stored) clearDraft('presentation', doc?.id ?? null)
  }, [demo, saved, doc?.id])

  // Keep the slides as they go, a moment after each change. Not while there's an older copy
  // waiting for an answer, which this would overwrite.
  useEffect(() => {
    if (demo || !draftChecked.current || recovered) return
    if (!dirty) return clearDraft('presentation', doc?.id ?? null)
    const timer = window.setTimeout(() => writeDraft('presentation', doc?.id ?? null, snapshot), AUTOSAVE_MS)
    return () => window.clearTimeout(timer)
  }, [demo, dirty, snapshot, recovered, doc?.id])

  const restoreDraft = () => {
    if (!recovered) return
    const s = JSON.parse(recovered.snapshot)
    setTitle(s.title ?? '')
    setSlug(s.slug ?? '')
    setDescription(s.description ?? '')
    setVisibility(s.visibility ?? 'public')
    setPublishAt(s.publishAt ?? null)
    setUnpublishAt(s.unpublishAt ?? null)
    setNotes(s.notes && typeof s.notes === 'object' ? s.notes : {})
    const restored: PresentationSlide[] = Array.isArray(s.slides) ? s.slides : []
    setSlides(restored)
    setSelectedId(restored[0]?.id ?? null)
    setSettings(deckSettings(s.settings))
    setEditorKey((k) => k + 1)
    setRecovered(null)
  }

  // Leaving with unsaved changes asks first: any link on the screen, and closing or reloading the tab
  const screenRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    screenRef.current = document.body
  }, [])
  useInterceptNavigation(screenRef, {
    shouldIntercept: dirty && !demo,
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
    if (demo) return toast({ title: 'This is a preview', message: 'Saving needs an officer sign-in, in the dashboard.' })
    if (saving.current) return
    saving.current = true
    const data = new FormData()
    if (loadedAt.current && !over) data.set('loaded_at', loadedAt.current)
    data.set('title', title)
    data.set('slug', slug)
    data.set('description', description)
    data.set('status', status)
    data.set('visibility', visibility)
    data.set('publish_at', atlantaToIso(publishAt) ?? '')
    data.set('unpublish_at', atlantaToIso(unpublishAt) ?? '')
    data.set('notes', JSON.stringify(notes))
    data.set('slides', JSON.stringify(slides))
    data.set('settings', JSON.stringify(settings))
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
  // A copy takes the slide's speaker notes with it, and is the one picked next
  const copy = (i: number) => {
    const id = crypto.randomUUID()
    const from = slides[i].id
    setSlides((all) => [...all.slice(0, i + 1), { ...all[i], id }, ...all.slice(i + 1)])
    if (notes[from]) setNotes((all) => ({ ...all, [id]: all[from] }))
    setSelectedId(id)
  }
  const full = slides.length >= PRESENTATION_SLIDES_MAX
  const selected = slides.find((x) => x.id === selectedId) ?? slides[0] ?? null
  const at = selected ? slides.indexOf(selected) : -1
  // A new slide goes after the one picked, and is picked
  const add = () => {
    const slide = newSlide()
    setSlides((all) => [...all.slice(0, at + 1), slide, ...all.slice(at + 1)])
    setSelectedId(slide.id)
  }
  const remove = () => {
    if (!selected) return
    setSelectedId(slides[at + 1]?.id ?? slides[at - 1]?.id ?? null)
    setSlides((all) => all.filter((x) => x.id !== selected.id))
  }
  /** The editor's report of a slide's writing; its first is the same writing in its own words, so what's saved follows */
  const onBody = (id: string, json: string, first: boolean) => {
    const before = slides.find((x) => x.id === id)?.body
    if (first && before !== undefined && before !== json) setSaved((snap) => rebase(snap, id, before, json))
    patch(id, { body: json })
  }
  const uploadSlideImage = async (file: File | undefined) => {
    if (!file || !selected) return
    const id = selected.id
    setImageUploading(true)
    try {
      patch(id, { image: await uploadImage(file) })
    } catch (e) {
      toast({ variant: 'error', title: 'That picture didn’t upload', message: e instanceof Error ? e.message : undefined })
    } finally {
      setImageUploading(false)
    }
  }

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
            {live ? 'Update' : Date.parse(atlantaToIso(publishAt) ?? '') > now ? 'Schedule' : 'Publish'}
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
            <SlugInput size="sm" value={slug} onValueChange={setSlug} source={title} prefix="/presentations/" locked={live} checkAvailability={demo ? undefined : (s) => checkSlug('presentation', s, doc?.id ?? null)} />
          </Field>

          <div className="grid items-start gap-4 md:grid-cols-[12.5rem_minmax(0,1fr)]">
            {/* The slides, in order: pick one to work on it, drag to reorder */}
            <div className="flex flex-col gap-2 md:sticky md:top-20 md:max-h-[calc(100vh-7rem)] md:overflow-y-auto md:pr-1">
              <Sortable
                aria-label="Slides, in order"
                items={slides}
                onItemsChange={setSlides}
                getKey={(x) => x.id}
                getLabel={(x) => x.title || 'Untitled slide'}
                renderItem={(x, { index, handleProps, active }) => (
                  <div className={cn('flex items-stretch rounded-lg border bg-surface', x.id === selected?.id ? 'border-brand ring-1 ring-brand' : 'border-line', active && 'border-brand')}>
                    <SortableHandle {...handleProps} />
                    <button
                      type="button"
                      aria-current={x.id === selected?.id ? 'true' : undefined}
                      onClick={() => setSelectedId(x.id)}
                      className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 rounded-md py-2 pr-2 pl-1 text-left focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <span className="flex items-center gap-1.5 text-[0.7rem] font-bold text-muted tabular-nums">
                        {index + 1}
                        {x.hidden ? <EyeOff size={12} aria-label="Hidden from the show" /> : null}
                      </span>
                      <span className={cn('line-clamp-2 text-[0.82rem] leading-snug font-semibold', x.hidden ? 'text-muted' : 'text-ink')}>{x.title || 'Untitled slide'}</span>
                      <span className="truncate text-[0.7rem] text-muted">{SLIDE_LAYOUTS.find((l) => l.value === (x.layout ?? 'content'))?.label}</span>
                    </button>
                  </div>
                )}
              />
              {full ? (
                <p className="m-0 text-[0.8rem] text-muted">Up to {PRESENTATION_SLIDES_MAX} slides.</p>
              ) : (
                <Button size="sm" variant="outline" block leading={<Plus size={15} aria-hidden />} onClick={add}>
                  Add a slide
                </Button>
              )}
            </div>

            {selected ? (
              <section key={`${editorKey}:${selected.id}`} aria-label={selected.title || `Slide ${at + 1}`} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.75rem] font-bold tracking-wide text-muted uppercase">
                    Slide {at + 1} of {slides.length}
                  </span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button type="button" aria-label="Move this slide up" disabled={at === 0} onClick={() => move(at, -1)} className={iconButton}>
                      <ArrowUp aria-hidden />
                    </button>
                    <button type="button" aria-label="Move this slide down" disabled={at === slides.length - 1} onClick={() => move(at, 1)} className={iconButton}>
                      <ArrowDown aria-hidden />
                    </button>
                    <button type="button" aria-label="Copy this slide" disabled={full} onClick={() => copy(at)} className={iconButton}>
                      <Copy aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Hide this slide from the show"
                      aria-pressed={!!selected.hidden}
                      onClick={() => patch(selected.id, { hidden: selected.hidden ? undefined : true })}
                      className={cn(iconButton, 'aria-pressed:bg-brand-tint aria-pressed:text-brand')}
                    >
                      {selected.hidden ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                    </button>
                    <button type="button" aria-label="Remove this slide" onClick={remove} className={cn(iconButton, 'hover:bg-danger/10 hover:text-danger')}>
                      <Trash2 aria-hidden />
                    </button>
                  </div>
                </div>

                {/* How it will look, in the deck's theme: drawn at full size, then shrunk to fit */}
                <div aria-hidden className={cn('relative aspect-video overflow-hidden rounded-lg border border-line bg-surface text-ink', themeClass(settings.theme), selected.hidden && 'opacity-50')}>
                  <div className="absolute top-0 left-0 origin-top-left" style={{ width: '166.667%', height: '166.667%', transform: 'scale(0.6)' }}>
                    <SlideView slide={{ id: selected.id, title: selected.title, layout: selected.layout, image: selected.image }} className="h-full">
                      {selected.body.trim() ? <DocumentBody source={selected.body} className="text-[1.1rem]" /> : null}
                    </SlideView>
                  </div>
                </div>
                {selected.hidden ? <p className="m-0 text-[0.8rem] text-muted">Hidden: it stays in the deck, but the show skips it.</p> : null}

                <Field label="Layout" description={SLIDE_LAYOUTS.find((l) => l.value === (selected.layout ?? 'content'))?.description}>
                  <Select
                    size="sm"
                    value={selected.layout ?? 'content'}
                    onValueChange={(v) => patch(selected.id, { layout: !v || v === 'content' ? undefined : (v as SlideLayout) })}
                    options={SLIDE_LAYOUTS.map(({ value, label }) => ({ value, label }))}
                  />
                </Field>
                <textarea
                  aria-label={`Slide ${at + 1} title`}
                  rows={1}
                  value={selected.title}
                  maxLength={SECTION_TITLE_MAX}
                  onChange={(e) => patch(selected.id, { title: e.target.value.replace(/\n/g, ' ') })}
                  placeholder="Slide title"
                  className="field-sizing-content w-full resize-none border-0 bg-transparent p-0 text-[1.35rem] leading-snug font-bold text-ink outline-none placeholder:text-ink-faint/60"
                />
                {usesImage(selected.layout) ? (
                  <Field label="Picture" description="Upload one, pick one from the library, or paste its https:// address.">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        size="sm"
                        type="url"
                        aria-label="Picture address"
                        value={selected.image ?? ''}
                        onChange={(e) => patch(selected.id, { image: e.target.value || undefined })}
                        placeholder="https://…"
                        className="min-w-40 flex-1"
                      />
                      <Button size="sm" variant="outline" leading={<Upload size={14} aria-hidden />} loading={imageUploading} onClick={() => imageFile.current?.click()}>
                        Upload
                      </Button>
                      <Button size="sm" variant="ghost" leading={<Images size={14} aria-hidden />} onClick={() => setPickingImage(true)}>
                        Library
                      </Button>
                    </div>
                  </Field>
                ) : null}
                <SlideWriting slide={selected} label={`Slide ${at + 1} writing`} onBody={(json, first) => onBody(selected.id, json, first)} />
                {/* For whoever presents it: shown in the dashboard's Present view, never on the site */}
                <Field label="Speaker notes" description="Only officers see these, under the slide when presenting from the dashboard.">
                  <TextArea
                    rows={2}
                    value={notes[selected.id] ?? ''}
                    maxLength={PRESENTATION_NOTES_MAX}
                    onChange={(e) => setNotes((all) => ({ ...all, [selected.id]: e.target.value }))}
                    placeholder="What to say on this slide"
                  />
                </Field>
                <MediaPicker open={pickingImage} onClose={() => setPickingImage(false)} onPick={(src) => patch(selected.id, { image: src })} />
                <input
                  ref={imageFile}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    uploadSlideImage(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </section>
            ) : (
              <p className="m-0 rounded-xl border border-dashed border-line p-6 text-center text-[0.9rem] text-muted">No slides yet. Add one to start.</p>
            )}
          </div>
          {errors.slides ? (
            <p role="alert" className="m-0 text-[0.85rem] font-semibold text-danger">
              {errors.slides}
            </p>
          ) : null}
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

          <Card title="Design">
            <Field label="Theme" description="The colours every slide is drawn in.">
              <Select size="sm" value={settings.theme} onValueChange={(v) => setSettings((all) => deckSettings({ ...all, theme: v }))} options={DECK_THEMES.map(({ value, label }) => ({ value, label }))} />
            </Field>
            <Field label="Transition" description="How a slide arrives.">
              <Select
                size="sm"
                value={settings.transition}
                onValueChange={(v) => setSettings((all) => deckSettings({ ...all, transition: v }))}
                options={DECK_TRANSITIONS.map(({ value, label }) => ({ value, label }))}
              />
            </Field>
            <Field label="Play by itself" description="Adds a Play button that turns the slides on a timer, round and round: for a table or a lobby screen.">
              <Select
                size="sm"
                value={String(settings.autoplay)}
                onValueChange={(v) => setSettings((all) => deckSettings({ ...all, autoplay: Number(v ?? 0) }))}
                options={DECK_AUTOPLAY.map(({ value, label }) => ({ value: String(value), label }))}
              />
            </Field>
          </Card>

          <Card title="Publishing">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[0.82rem]">
              <dt className="text-muted">Status</dt>
              <dd className="m-0 text-ink">
                {!live ? 'Draft, only officers see it' : waiting ? `Goes live ${formatDate(doc?.publish_at, true)}` : ended ? 'Its time is up; only officers see it' : doc?.visibility === 'private' ? 'Published for officers only' : doc?.visibility === 'unlisted' ? 'Live for anyone with the link' : 'Live on the site'}
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
            <div className="flex flex-col gap-3 border-t border-line pt-3">
              <Field label="Goes live" error={errors.publish_at} description="Atlanta time. Blank: as soon as it’s published.">
                <DateTimePicker size="sm" value={publishAt} onValueChange={setPublishAt} />
              </Field>
              <Field label="Comes down" error={errors.unpublish_at} description="Atlanta time. Blank: it stays up.">
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
            {doc && !demo ? (
              <>
                {/* The saved version, played in the dashboard: drafts and private ones too */}
                <Button href={`${LIST}/${doc.id}/present`} size="sm" variant="outline" block leading={<Play size={14} aria-hidden />}>
                  Present
                </Button>
                {dirty ? <p className="m-0 text-[0.78rem] text-muted">Save first to present your latest changes.</p> : null}
                {live && !waiting && !ended && doc.visibility !== 'private' ? (
                  <Button href={`/presentations/${doc.slug}`} size="sm" variant="outline" block external leading={<ExternalLink size={14} aria-hidden />}>
                    View on the site
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" block leading={<Copy size={14} aria-hidden />} onClick={() => run(() => duplicateDocument('presentation', doc.id), (result) => router.push(`${LIST}/${result.id}`))}>
                  Duplicate
                </Button>
                <Button size="sm" variant="outline" block leading={<History size={14} aria-hidden />} onClick={() => setHistoryOpen(true)}>
                  History
                </Button>
                {/* Every slide, one to a page, as last saved; drafts and private ones print for officers */}
                <Button href={`/presentations/${doc.slug}/print`} size="sm" variant="outline" block leading={<Printer size={14} aria-hidden />} target="_blank" rel="noopener">
                  Print or save as PDF
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
              <p className="m-0 text-[0.78rem] text-muted">{demo ? 'Presenting, history, and printing are in the dashboard.' : 'Save it to present it.'}</p>
            )}
          </Card>
        </aside>
      </div>

      {doc && !demo ? <RevisionHistory kind="presentation" docId={doc.id} open={historyOpen} onClose={() => setHistoryOpen(false)} dirty={dirty} live={live && doc.visibility !== 'private'} onRestored={reload} /> : null}
    </div>
  )
}
