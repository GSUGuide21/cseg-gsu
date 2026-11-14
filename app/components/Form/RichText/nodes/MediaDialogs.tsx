'use client'

/* eslint-disable @next/next/no-img-element -- images can be from any site, at any size */
import { Trash2, Upload } from 'lucide-react'
import { useRef, useState, type FC } from 'react'

import {
  EMBED_HEIGHT,
  EMBED_SITES,
  EMBED_TITLE_MAX,
  Embed,
  embedFromInput,
  FILE_NAME_MAX,
  FILE_NOTE_MAX,
  FileCard,
  fileNameFrom,
  GALLERY_LAYOUTS,
  GALLERY_MAX,
  IMAGE_ALT_MAX,
  IMAGE_CAPTION_MAX,
  videoFromUrl,
  type EmbedData,
  type FileData,
  type GalleryBlockLayout,
  type GalleryPhoto,
} from '@/lib/richtext/blocks'
import { safeSrc } from '@/lib/safeUrl'

import { Button } from '../../../Button'
import { Dialog } from '../../../Dialog'
import { Portal } from '../../../Portal'
import { Field } from '../../Field'
import { Input } from '../../Input'
import { SegmentedControl } from '../../Segmented'
import { Sortable, SortableHandle } from '../../Sortable'
import { uploadMessage, useRichTextOptions } from '../context'
import type { BlockDialogProps } from './DataBlockNode'

export type GalleryData = { items: GalleryPhoto[]; layout: GalleryBlockLayout }

const Footer: FC<{ editing: boolean; disabled?: boolean; onClose: () => void; onSave: () => void }> = ({ editing, disabled, onClose, onSave }) => (
  <>
    <Button variant="outline" onClick={onClose}>
      Cancel
    </Button>
    <Button onClick={onSave} disabled={disabled}>
      {editing ? 'Save' : 'Insert'}
    </Button>
  </>
)

// ── Photo gallery ───────────────────────────────────────────────────────────

const GalleryForm: FC<Omit<BlockDialogProps<GalleryData>, 'open'>> = ({ initial, onClose, onSave }) => {
  const { uploadImage, imagePicker: ImagePicker } = useRichTextOptions()
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initial?.items ?? [])
  const [layout, setLayout] = useState<GalleryBlockLayout>(initial?.layout ?? 'grid')
  const [address, setAddress] = useState('')
  const [uploading, setUploading] = useState(0)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const full = photos.length >= GALLERY_MAX

  /** Adds photos by address, leaving out ones already there and anything past the most a gallery holds */
  const add = (srcs: string[]) =>
    setPhotos((now) => {
      const next = [...now]
      for (const src of srcs) if (next.length < GALLERY_MAX && !next.some((p) => p.src === src)) next.push({ src, alt: '', caption: '' })
      return next
    })

  const upload = async (files: FileList | null) => {
    if (!files?.length || !uploadImage) return
    const images = [...files].filter((f) => f.type.startsWith('image/')).slice(0, GALLERY_MAX - photos.length)
    if (!images.length) return setError('Those files aren’t images.')
    setError('')
    setUploading(images.length)
    try {
      // One at a time, so they go in the order they were picked
      for (const file of images) {
        add([await uploadImage(file)])
        setUploading((n) => n - 1)
      }
    } catch (e) {
      setError(uploadMessage(e))
    } finally {
      setUploading(0)
    }
  }

  const addAddress = () => {
    const src = safeSrc(address)
    if (!src) return setError('Use an https:// image address.')
    setError('')
    add([src])
    setAddress('')
  }

  const set = (src: string, patch: Partial<GalleryPhoto>) => setPhotos((now) => now.map((p) => (p.src === src ? { ...p, ...patch } : p)))

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={initial ? 'Edit photo gallery' : 'Insert a photo gallery'}
      description="Several photos together. On the site, each opens larger, with arrows to the next."
      footer={<Footer editing={!!initial} disabled={!photos.length || uploading > 0} onClose={onClose} onSave={() => onSave({ items: photos.map((p) => ({ ...p, alt: p.alt.trim(), caption: p.caption.trim() })), layout })} />}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {uploadImage ? (
            <>
              <Button variant="outline" size="sm" leading={<Upload size={15} aria-hidden />} loading={uploading > 0} disabled={full} onClick={() => fileRef.current?.click()}>
                {uploading > 0 ? `Uploading ${uploading}…` : 'Upload photos'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  upload(e.target.files)
                  e.target.value = ''
                }}
              />
            </>
          ) : null}
          {ImagePicker ? (
            <Button variant="outline" size="sm" disabled={full} onClick={() => setPicking(true)}>
              Choose from the library
            </Button>
          ) : null}
          <span className="text-[0.8rem] text-muted">
            {photos.length} of {GALLERY_MAX}
          </span>
        </div>

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            addAddress()
          }}
        >
          <Field label="Or add one by its address" className="min-w-0 flex-1">
            <Input size="sm" type="url" inputMode="url" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="https://…" />
          </Field>
          <Button type="submit" size="sm" variant="outline" disabled={!address.trim() || full}>
            Add
          </Button>
        </form>

        {error ? (
          <p role="alert" className="m-0 text-[0.85rem] font-semibold text-danger">
            {error}
          </p>
        ) : null}

        {photos.length ? (
          <>
            <p className="m-0 text-[0.85rem] text-muted">Drag the grips to reorder. Describe each photo for people who can’t see it.</p>
            <Sortable
              aria-label="Photos, in order"
              items={photos}
              onItemsChange={setPhotos}
              getKey={(p) => p.src}
              getLabel={(p) => p.alt || `photo ${photos.indexOf(p) + 1}`}
              renderItem={(p, { index, handleProps }) => (
                <div className="flex items-start gap-3 rounded-lg border border-line bg-surface p-2.5">
                  <span className="pt-4">
                    <SortableHandle {...handleProps} />
                  </span>
                  <img src={p.src} alt="" className="size-16 shrink-0 rounded-md border border-line object-cover" />
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <Input size="sm" aria-label={`Description of photo ${index + 1}`} value={p.alt} maxLength={IMAGE_ALT_MAX} onChange={(e) => set(p.src, { alt: e.target.value })} placeholder="What’s in it" />
                    <Input size="sm" aria-label={`Caption of photo ${index + 1}`} value={p.caption} maxLength={IMAGE_CAPTION_MAX} onChange={(e) => set(p.src, { caption: e.target.value })} placeholder="Caption (optional)" />
                  </div>
                  <Button size="sm" variant="ghost" aria-label={`Remove photo ${index + 1}`} onClick={() => setPhotos((now) => now.filter((x) => x.src !== p.src))}>
                    <Trash2 size={15} aria-hidden />
                  </Button>
                </div>
              )}
            />
          </>
        ) : (
          <p className="m-0 rounded-lg border border-dashed border-line bg-fill px-4 py-6 text-center text-[0.85rem] text-muted">No photos yet.</p>
        )}

        <Field label="Layout" description={GALLERY_LAYOUTS[layout].hint}>
          <SegmentedControl size="sm" value={layout} onValueChange={(v) => setLayout(v as GalleryBlockLayout)} options={(Object.keys(GALLERY_LAYOUTS) as GalleryBlockLayout[]).map((value) => ({ value, label: GALLERY_LAYOUTS[value].label }))} />
        </Field>
      </div>
      {ImagePicker ? <ImagePicker open={picking} onClose={() => setPicking(false)} onPick={(src) => add([src])} /> : null}
    </Dialog>
  )
}

/** Picks the photos of a gallery: uploaded (several at once), from the library, or by address. Opens outside the editor. */
export const GalleryDialog: FC<BlockDialogProps<GalleryData>> = ({ open, ...props }) =>
  open ? (
    <Portal>
      <GalleryForm {...props} />
    </Portal>
  ) : null

// ── File ────────────────────────────────────────────────────────────────────

const FileForm: FC<Omit<BlockDialogProps<FileData>, 'open'>> = ({ initial, onClose, onSave }) => {
  const { uploadFile, fileAccept } = useRichTextOptions()
  const [href, setHref] = useState(initial?.href ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const safe = safeSrc(href)

  const upload = async (file: File | undefined) => {
    if (!file || !uploadFile) return
    setUploading(true)
    setError('')
    try {
      const stored = await uploadFile(file)
      setHref(stored.url)
      // Its own name, unless one's been typed
      setName((typed) => typed || stored.name)
    } catch (e) {
      setError(uploadMessage(e, 'file'))
    } finally {
      setUploading(false)
    }
  }

  const save = () => {
    if (!safe) return setError('Use the file’s https:// address, or a path on this site like /files/flyer.pdf.')
    onSave({ href: safe, name: name.trim() || fileNameFrom(safe), note: note.trim() })
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={initial ? 'Edit file' : 'Insert a file'}
      description={
        uploadFile
          ? 'A card linking to a file to open or download: a flyer, a form, a PDF. Upload one, or link to wherever it’s kept, such as Google Drive.'
          : 'A card linking to a file to open or download: a flyer, a form, a PDF. Use the link from wherever the file is kept, such as Google Drive (shared so anyone with the link can view).'
      }
      footer={<Footer editing={!!initial} disabled={!href.trim() || uploading} onClose={onClose} onSave={save} />}
    >
      {uploadFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            upload(e.dataTransfer.files[0])
          }}
          className={`mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-4 py-3 transition-colors ${dragging ? 'border-brand bg-brand-tint' : 'border-line bg-fill'}`}
        >
          <Button variant="outline" size="sm" leading={<Upload size={15} aria-hidden />} loading={uploading} onClick={() => fileRef.current?.click()}>
            {href ? 'Upload another file' : 'Upload a file'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept={fileAccept}
            hidden
            aria-label="File to upload"
            onChange={(e) => {
              upload(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <span className="text-[0.8rem] text-muted">{uploading ? 'Uploading…' : 'Or drop it here. PDF, Word, Excel, PowerPoint, up to 15 MB.'}</span>
        </div>
      ) : null}
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field label="File address" error={error || undefined}>
          <Input
            size="sm"
            inputMode="url"
            value={href}
            onChange={(e) => {
              setHref(e.target.value)
              setError('')
            }}
            placeholder="https://…/welcome-week-flyer.pdf"
          />
        </Field>
        <Field label="Name" description="Left empty, the file’s own name.">
          <Input size="sm" value={name} maxLength={FILE_NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder="Welcome Week flyer" />
        </Field>
        <Field label="A line about it" description="Optional.">
          <Input size="sm" value={note} maxLength={FILE_NOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder="Print and post in your building" />
        </Field>
        {safe ? <FileCard href={safe} name={name.trim()} note={note.trim()} preview /> : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}

/** A file to open or download, by its address. Opens outside the editor. */
export const FileDialog: FC<BlockDialogProps<FileData>> = ({ open, ...props }) =>
  open ? (
    <Portal>
      <FileForm {...props} />
    </Portal>
  ) : null

// ── Embed ───────────────────────────────────────────────────────────────────

const EmbedForm: FC<Omit<BlockDialogProps<EmbedData>, 'open'>> = ({ initial, onClose, onSave }) => {
  const [typed, setTyped] = useState(initial?.src ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  // Its own height once it's been set by hand; until then, what suits the site it's from
  const [height, setHeight] = useState(initial ? String(initial.height) : '')
  const [error, setError] = useState('')
  const found = typed.trim() ? embedFromInput(typed) : null
  const tall = Math.min(EMBED_HEIGHT.max, Math.max(EMBED_HEIGHT.min, Math.round(Number(height)) || found?.height || EMBED_HEIGHT.fallback))

  const save = () => {
    if (!found)
      return setError(
        videoFromUrl(typed)
          ? 'That’s a video: use the Video block for YouTube and Vimeo.'
          : `That isn’t something that can be shown in the page. Paste a link, or the site’s own embed code, from ${EMBED_SITES}.`
      )
    onSave({ src: found.src, title: title.trim(), height: tall })
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={initial ? 'Edit embed' : 'Embed from another site'}
      description={`Shows something from another site in the page: ${EMBED_SITES}.`}
      footer={<Footer editing={!!initial} disabled={!typed.trim()} onClose={onClose} onSave={save} />}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field
          label="Link or embed code"
          error={error || undefined}
          description={found ? `Found a ${found.provider}.` : 'For a Google Map or Calendar, paste the code from its own “Embed” option.'}
        >
          <Input
            size="sm"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value)
              setError('')
            }}
            placeholder="https://docs.google.com/forms/d/e/…/viewform"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Field label="Title" description="Names it for screen readers, and shows under it.">
            <Input size="sm" value={title} maxLength={EMBED_TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="Sign up for the spring retreat" />
          </Field>
          <Field label="Height, in pixels" description={`${EMBED_HEIGHT.min} to ${EMBED_HEIGHT.max}.`}>
            <Input size="sm" type="number" inputMode="numeric" min={EMBED_HEIGHT.min} max={EMBED_HEIGHT.max} value={height} onChange={(e) => setHeight(e.target.value)} placeholder={String(found?.height ?? EMBED_HEIGHT.fallback)} />
          </Field>
        </div>
        {found ? <Embed src={found.src} title="" height={tall} preview /> : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}

/** Something from another site, from its link or embed code. Opens outside the editor. */
export const EmbedDialog: FC<BlockDialogProps<EmbedData>> = ({ open, ...props }) =>
  open ? (
    <Portal>
      <EmbedForm {...props} />
    </Portal>
  ) : null
