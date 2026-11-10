'use client'

/* eslint-disable @next/next/no-img-element -- uploads come at any size, from Storage */
import { Copy, ImageIcon, Images, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FC } from 'react'

import { Alert, Badge, Button, EmptyState, Skeleton, useNotify } from '@/components'
import { SegmentedControl } from '@/components/Form'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/dashboard/format'
import { deleteMedia, formatBytes, listMedia, uploadImage, type MediaFile } from '@/lib/dashboard/media'

import { PageTitle } from '../ui'

const nameOf = (f: MediaFile) => f.path.split('/').pop() ?? f.path

/** Everything uploaded for posts and pages: see what's in use, reuse it, clear out the rest */
export const MediaView: FC<{ usage: Record<string, string[]> }> = ({ usage }) => {
  const { confirm, toast } = useNotify()
  const [files, setFiles] = useState<MediaFile[] | null>(null)
  const [error, setError] = useState('')
  const [show, setShow] = useState('all')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(
    () =>
      listMedia()
        .then(setFiles)
        .catch((e: Error) => setError(e.message)),
    []
  )
  useEffect(() => {
    load()
  }, [load])

  const upload = async (chosen: File[]) => {
    if (!chosen.length) return
    setUploading(true)
    for (const file of chosen) {
      try {
        await uploadImage(file)
      } catch (e) {
        toast({ variant: 'error', title: `Couldn’t upload ${file.name}`, message: e instanceof Error ? e.message : undefined })
      }
    }
    await load()
    setUploading(false)
  }

  const remove = async (file: MediaFile) => {
    const usedIn = usage[file.path] ?? []
    const ok = await confirm({
      title: 'Delete this image?',
      message: usedIn.length ? `It’s used in ${usedIn.join(', ')}, and will show as a broken image there. This can’t be undone.` : 'This can’t be undone.',
      variant: 'error',
      confirmLabel: 'Delete',
    })
    if (!ok) return
    try {
      await deleteMedia(file.path)
      setFiles((all) => all?.filter((f) => f.path !== file.path) ?? null)
      toast({ variant: 'success', title: 'Image deleted' })
    } catch (e) {
      toast({ variant: 'error', title: 'Couldn’t delete', message: e instanceof Error ? e.message : undefined })
    }
  }

  const copy = async (file: MediaFile) => {
    await navigator.clipboard.writeText(file.url)
    toast({ variant: 'success', title: 'Link copied' })
  }

  const shown = files?.filter((f) => show === 'all' || (show === 'used') === !!usage[f.path]) ?? []

  return (
    <>
      <PageTitle
        icon={<Images />}
        title="Media"
        description="Every image uploaded for posts and pages. Upload here, or from the editor; either way they’re ready to use again."
        actions={
          <>
            <Button size="sm" leading={<Upload size={15} aria-hidden />} loading={uploading} onClick={() => fileRef.current?.click()}>
              Upload images
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              aria-label="Upload images"
              onChange={(e) => {
                upload([...(e.target.files ?? [])])
                e.target.value = ''
              }}
            />
          </>
        }
      />
      <div
        className={cn('flex flex-col gap-4 rounded-xl transition-colors', dragging && 'bg-brand-tint outline-2 outline-offset-4 outline-brand')}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          upload([...e.dataTransfer.files])
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            aria-label="Which images to show"
            value={show}
            onValueChange={setShow}
            options={[
              { value: 'all', label: 'All' },
              { value: 'used', label: 'In use' },
              { value: 'unused', label: 'Not in use' },
            ]}
          />
          {files ? (
            <span aria-live="polite" className="text-[0.85rem] text-muted">
              {shown.length} {shown.length === 1 ? 'image' : 'images'}
            </span>
          ) : null}
        </div>

        {error ? (
          <Alert tone="danger" title="Couldn’t load the library">
            {error}
          </Alert>
        ) : !files ? (
          <div aria-busy className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} height={232} />
            ))}
          </div>
        ) : shown.length ? (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4 p-0">
            {shown.map((f) => {
              const usedIn = usage[f.path] ?? []
              return (
                <li key={f.path} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${nameOf(f)}`} className="block bg-fill">
                    <img src={f.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                  </a>
                  <div className="flex flex-col gap-1.5 p-2.5">
                    <span className="truncate text-[0.78rem] text-muted">{[formatDate(f.createdAt), formatBytes(f.size)].filter(Boolean).join(' · ')}</span>
                    <div className="flex items-center justify-between gap-1">
                      <span title={usedIn.join(', ') || undefined}>
                        {usedIn.length ? (
                          <Badge size="sm" dot tone="success">
                            In use
                          </Badge>
                        ) : (
                          <Badge size="sm">Not in use</Badge>
                        )}
                      </span>
                      <span className="flex items-center">
                        <Button size="sm" variant="ghost" iconOnly aria-label={`Copy link to ${nameOf(f)}`} onClick={() => copy(f)}>
                          <Copy size={15} aria-hidden />
                        </Button>
                        <Button size="sm" variant="ghost" iconOnly aria-label={`Delete ${nameOf(f)}`} className="hover:text-danger" onClick={() => remove(f)}>
                          <Trash2 size={15} aria-hidden />
                        </Button>
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            bordered
            icon={<ImageIcon />}
            title={files.length ? 'Nothing here' : 'No images yet'}
            description={files.length ? 'Try a different view.' : 'Upload images here, or drop them anywhere on this page.'}
          />
        )}
      </div>
    </>
  )
}
