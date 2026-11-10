'use client'
/* eslint-disable @next/next/no-img-element -- uploads come at any size, from Storage */

import { Image as ImageIcon, Images, Upload } from 'lucide-react'
import { useRef, useState, type FC } from 'react'

import { Button } from '@/components'
import { Field, Input } from '@/components/Form'
import { uploadImage } from '@/lib/dashboard/media'
import { cn } from '@/lib/cn'

import { MediaPicker } from './MediaPicker'

export type ImageFieldProps = {
  /** The form field its address is sent as */
  name: string
  label: string
  defaultValue?: string | null
  error?: string
  description?: string
  /** The preview's shape: wide like an event's picture, or square like a portrait */
  shape?: 'wide' | 'square'
}

/**
 * An image for a form, as a post's cover is chosen: upload one, pick one from the media
 * library, or paste its address. Sent with the form as its https address ("" for none).
 */
export const ImageField: FC<ImageFieldProps> = ({ name, label, defaultValue, error, description, shape = 'wide' }) => {
  const [src, setSrc] = useState(defaultValue ?? '')
  const [failed, setFailed] = useState(false)
  const [picking, setPicking] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const upload = async (f: File | undefined) => {
    if (!f) return
    setUploading(true)
    setUploadError('')
    try {
      setSrc(await uploadImage(f))
      setFailed(false)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Couldn’t upload that image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Field label={label} description={description} error={error ?? (uploadError || undefined)}>
      <div className="flex flex-wrap items-start gap-3">
        <div className={cn('grid shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-line bg-fill', shape === 'square' ? 'size-24' : 'aspect-2/1 w-40')}>
          {src && !failed ? (
            <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(true)} onLoad={() => setFailed(false)} />
          ) : (
            <span className="flex flex-col items-center gap-1 px-2 text-center text-[0.75rem] text-muted">
              <ImageIcon size={18} aria-hidden />
              {src && failed ? 'Didn’t load' : 'None'}
            </span>
          )}
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" leading={<Upload size={14} aria-hidden />} loading={uploading} onClick={() => file.current?.click()}>
              Upload
            </Button>
            <Button size="sm" variant="ghost" leading={<Images size={14} aria-hidden />} onClick={() => setPicking(true)}>
              From the library
            </Button>
            {src ? (
              <Button size="sm" variant="ghost" onClick={() => setSrc('')}>
                Remove
              </Button>
            ) : null}
          </div>
          <Input
            name={name}
            size="sm"
            inputMode="url"
            value={src}
            onChange={(e) => {
              setSrc(e.target.value)
              setFailed(false)
            }}
            placeholder="https://…"
          />
        </div>
      </div>
      <input
        ref={file}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(picked) => {
          setSrc(picked)
          setFailed(false)
        }}
      />
    </Field>
  )
}
