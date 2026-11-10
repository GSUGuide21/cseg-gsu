'use client'

/* eslint-disable @next/next/no-img-element -- uploads come at any size, from Storage */
import { ImageIcon } from 'lucide-react'
import { useEffect, useState, type FC } from 'react'

import { Alert, Button, Dialog, EmptyState, Skeleton } from '@/components'
import type { ImagePickerProps } from '@/components/Form/RichText/types'
import { listMedia, type MediaFile } from '@/lib/dashboard/media'
import { formatDate } from '@/lib/dashboard/format'

/** Pick an image that's already been uploaded, for a post or page */
export const MediaPicker: FC<ImagePickerProps> = ({ open, onClose, onPick }) => {
  const [files, setFiles] = useState<MediaFile[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    listMedia()
      .then(setFiles)
      .catch((e: Error) => setError(e.message))
  }, [open])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Choose from the library"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {error ? (
        <Alert tone="danger">{error}</Alert>
      ) : !files ? (
        <div aria-busy className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={128} />
          ))}
        </div>
      ) : files.length ? (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3 p-0">
          {files.map((f) => (
            <li key={f.path}>
              <button
                type="button"
                aria-label={`Use the image from ${formatDate(f.createdAt)}, ${f.path.split('/').pop()}`}
                className="block w-full cursor-pointer overflow-hidden rounded-lg border border-line bg-fill transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                onClick={() => {
                  onPick(f.url)
                  onClose()
                }}
              >
                <img src={f.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState size="sm" icon={<ImageIcon />} title="Nothing uploaded yet" description="Images you upload show up here, ready to use again." />
      )}
    </Dialog>
  )
}
