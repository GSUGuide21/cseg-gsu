'use client'

/* eslint-disable @next/next/no-img-element -- images can be from any site, at any size */
import { ImageIcon, Upload } from 'lucide-react'
import { useRef, useState, type FC } from 'react'

import { cn } from '@/lib/cn'
import { IMAGE_ALIGNS, IMAGE_ALT_MAX, IMAGE_CAPTION_MAX, IMAGE_SIZES, IMAGE_WIDTH, type ImageAlign, type ImageData, type ImageSize } from '@/lib/richtext/blocks'
import { linkFromInput, safeSrc } from '@/lib/safeUrl'

import { Button } from '../../../Button'
import { Dialog } from '../../../Dialog'
import { Portal } from '../../../Portal'
import { Field } from '../../Field'
import { Input } from '../../Input'
import { Select } from '../../Select'
import { Slider } from '../../Slider'
import { uploadMessage, useRichTextOptions } from '../context'

const ImageForm: FC<{ initial?: ImageData; inline?: boolean; onClose: () => void; onSave: (image: ImageData) => void }> = ({ initial, inline = false, onClose, onSave }) => {
  const { uploadImage, imagePicker: ImagePicker } = useRichTextOptions()
  const [picking, setPicking] = useState(false)
  const [src, setSrc] = useState(initial?.src ?? '')
  const [alt, setAlt] = useState(initial?.alt ?? '')
  const [caption, setCaption] = useState(initial?.caption ?? '')
  const [size, setSize] = useState<ImageSize>(initial?.size ?? 'full')
  // A width of its own (dragged in the editor, or set here); 0 keeps the size's
  const [width, setWidth] = useState(initial?.width ?? 0)
  const [align, setAlign] = useState<ImageAlign>(initial?.align ?? 'center')
  const [href, setHref] = useState(initial?.href ?? '')
  const [linkError, setLinkError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [broken, setBroken] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const shown = safeSrc(src)

  const upload = async (file: File | undefined) => {
    if (!file || !uploadImage) return
    if (!file.type.startsWith('image/')) return setError('That file isn’t an image.')
    setUploading(true)
    setError('')
    try {
      setSrc(await uploadImage(file))
      setBroken(false)
    } catch (e) {
      setError(uploadMessage(e))
    } finally {
      setUploading(false)
    }
  }

  const save = () => {
    const ok = safeSrc(src)
    if (!ok) return setError(uploadImage ? 'Upload an image, or use an https:// image address.' : 'Use an https:// image address.')
    if (inline) return onSave({ src: ok, alt: alt.trim(), caption: caption.trim() })
    const link = href.trim() ? linkFromInput(href) : ''
    if (link === null) return setLinkError('Use a page here (/join), a full link (https://…), or leave it empty.')
    onSave({ src: ok, alt: alt.trim(), caption: caption.trim(), size, align, href: link, width })
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={initial ? 'Edit image' : inline ? 'Insert an inline image' : 'Insert an image'}
      description={inline ? 'Sits in the line of text, as tall as the line: best for a logo or an icon.' : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={uploading || !src.trim()}>
            {initial ? 'Save' : 'Insert'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div
          // Drop an image here, as well as choosing one
          onDragOver={(e) => {
            if (!uploadImage) return
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            if (!uploadImage) return
            e.preventDefault()
            setDragging(false)
            upload(e.dataTransfer.files[0])
          }}
          className={cn(
            'grid min-h-44 place-items-center overflow-hidden rounded-lg border border-dashed bg-fill transition-colors',
            dragging ? 'border-brand bg-brand-tint' : 'border-line'
          )}
        >
          {shown && !broken ? (
            <img src={shown} alt="" className="max-h-64 w-auto max-w-full object-contain" onError={() => setBroken(true)} onLoad={() => setBroken(false)} />
          ) : (
            <span className="flex flex-col items-center gap-1.5 px-4 py-6 text-center text-[0.85rem] text-muted">
              <ImageIcon size={24} aria-hidden />
              {uploading ? 'Uploading…' : shown && broken ? 'That image didn’t load. Check the address?' : uploadImage ? 'Drop an image here, or choose one.' : 'Paste an image’s address below.'}
            </span>
          )}
        </div>

        {uploadImage ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" leading={<Upload size={15} aria-hidden />} loading={uploading} onClick={() => fileRef.current?.click()}>
              {src ? 'Choose another image' : 'Choose an image'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                upload(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            {ImagePicker ? (
              <Button variant="outline" size="sm" onClick={() => setPicking(true)}>
                Choose from the library
              </Button>
            ) : null}
            <span className="text-[0.8rem] text-muted">JPG, PNG, GIF, or WebP</span>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="m-0 text-[0.85rem] font-semibold text-danger">
            {error}
          </p>
        ) : null}

        <Field label="Image address" description={uploadImage ? 'Filled in for you after an upload.' : undefined}>
          <Input
            size="sm"
            type="url"
            inputMode="url"
            value={src}
            onChange={(e) => {
              setSrc(e.target.value)
              setBroken(false)
              setError('')
            }}
            placeholder="https://…"
          />
        </Field>
        <Field label="Description" description="What’s in it, for people who can’t see it. Leave it empty if the image is only decoration.">
          <Input size="sm" value={alt} maxLength={IMAGE_ALT_MAX} onChange={(e) => setAlt(e.target.value)} placeholder="Officers at the spring welcome table" />
        </Field>
        {inline ? null : (
          <>
            <Field label="Caption" description="Optional. Shown under the image.">
              <Input size="sm" value={caption} maxLength={IMAGE_CAPTION_MAX} onChange={(e) => setCaption(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Size">
                <Select
                  size="sm"
                  value={width ? 'custom' : size}
                  onValueChange={(v) => {
                    if (v === 'custom') return setWidth((w) => w || 50)
                    setWidth(0)
                    setSize((v ?? 'full') as ImageSize)
                  }}
                  options={[...(Object.keys(IMAGE_SIZES) as ImageSize[]).map((value) => ({ value, label: IMAGE_SIZES[value].label })), { value: 'custom', label: 'Custom width' }]}
                />
              </Field>
              <Field label="Where it sits" description={align === 'center' ? undefined : 'On the site, the writing after it wraps beside it (not on phones).'}>
                <Select size="sm" value={align} onValueChange={(v) => setAlign((v ?? 'center') as ImageAlign)} options={(Object.keys(IMAGE_ALIGNS) as ImageAlign[]).map((value) => ({ value, label: IMAGE_ALIGNS[value].label }))} />
              </Field>
            </div>
            {width ? (
              <Field label="Width" description="Of the column, from tablet width up. You can also drag the image’s edge in the editor.">
                <Slider min={IMAGE_WIDTH.min} max={IMAGE_WIDTH.max} step={IMAGE_WIDTH.step} value={width} onValueChange={setWidth} formatValue={(v) => `${v}%`} />
              </Field>
            ) : null}
            <Field label="Link" description="Optional. Where a click on the image goes." error={linkError || undefined}>
              <Input
                size="sm"
                inputMode="url"
                value={href}
                onChange={(e) => {
                  setHref(e.target.value)
                  setLinkError('')
                }}
                placeholder="/events or https://…"
              />
            </Field>
          </>
        )}
        {/* Enter in a field saves, as the button does */}
        <button type="submit" hidden />
      </form>
      {ImagePicker ? (
        <ImagePicker
          open={picking}
          onClose={() => setPicking(false)}
          onPick={(picked) => {
            setSrc(picked)
            setBroken(false)
            setError('')
          }}
        />
      ) : null}
    </Dialog>
  )
}

/**
 * Picks an image for the editor: uploaded (when the page gave the editor a way to, with
 * `uploadImage`) or by its address, with a description and a caption. It opens at the end
 * of the page, outside the editor, so typing in it can't reach the text.
 */
export const ImageDialog: FC<{ open: boolean; initial?: ImageData; inline?: boolean; onClose: () => void; onSave: (image: ImageData) => void }> = ({ open, ...props }) =>
  open ? (
    <Portal>
      <ImageForm {...props} />
    </Portal>
  ) : null
