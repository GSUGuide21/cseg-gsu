'use client'

import { useState, type FC } from 'react'

import { VIDEO_TITLE_MAX, Video, videoFromUrl, watchUrl, type VideoData } from '@/lib/richtext/blocks'

import { Button } from '../../../Button'
import { Dialog } from '../../../Dialog'
import { Portal } from '../../../Portal'
import { Field } from '../../Field'
import { Input } from '../../Input'

const VideoForm: FC<{ initial?: VideoData; onClose: () => void; onSave: (video: VideoData) => void }> = ({ initial, onClose, onSave }) => {
  const [url, setUrl] = useState(initial?.provider ? watchUrl({ provider: initial.provider, id: initial.id }) : '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [error, setError] = useState('')
  const found = url.trim() ? videoFromUrl(url) : null

  const save = () => {
    if (!found) return setError('Paste a YouTube or Vimeo link, like https://youtu.be/… or https://vimeo.com/….')
    onSave({ ...found, title: title.trim() })
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={initial ? 'Edit video' : 'Insert a video'}
      description="From YouTube or Vimeo. It plays in their privacy-minded player."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!url.trim()}>
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
        <Field label="Video link" error={error || undefined} description={found ? `Found a ${found.provider === 'youtube' ? 'YouTube' : 'Vimeo'} video.` : undefined}>
          <Input
            size="sm"
            inputMode="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError('')
            }}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </Field>
        <Field label="Title" description="Names the player for screen readers, and shows under the video.">
          <Input size="sm" value={title} maxLength={VIDEO_TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="Welcome Week highlights" />
        </Field>
        {found ? <Video video={{ ...found, title: '' }} preview /> : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}

/** Picks a YouTube or Vimeo video by its link. Opens outside the editor, as ImageDialog does. */
export const VideoDialog: FC<{ open: boolean; initial?: VideoData; onClose: () => void; onSave: (video: VideoData) => void }> = ({ open, ...props }) =>
  open ? (
    <Portal>
      <VideoForm {...props} />
    </Portal>
  ) : null
