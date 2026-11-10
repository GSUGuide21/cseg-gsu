'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Uploading images for posts and pages, straight from the browser to Supabase Storage as
 * the signed-in officer. The bucket's policies (supabase/migrations/…_media.sql) only let
 * officers write to it, and Storage itself turns away other types and big files; the
 * checks here are so the message is clear before anything is sent.
 */

export const MEDIA_BUCKET = 'media'
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

/** Stores an image and gives back its public https address; throws with a message to show */
export async function uploadImage(file: File): Promise<string> {
  const ext = EXTENSIONS[file.type]
  if (!ext) throw new Error('Use a JPG, PNG, GIF, or WebP image.')
  if (file.size > MEDIA_MAX_BYTES) throw new Error(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Images can be up to 5 MB.`)
  const supabase = createClient()
  if (!supabase) throw new Error('Uploads need Supabase set up first.')
  // Filed by month, under a name nobody can guess or collide with
  const now = new Date()
  const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
  if (error) {
    if (/row-level security|unauthorized|403/i.test(error.message)) throw new Error('Only officers can upload images. Try signing in again.')
    if (/bucket not found/i.test(error.message)) throw new Error('The media bucket isn’t set up yet. Run the media migration in Supabase.')
    throw new Error(error.message)
  }
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

export const IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 
  'webp', 'avif', "svg", "bmp", 
  "tiff", "ico"
]

export const VIDEO_EXTENSIONS = [
  'mp4', 'webm', 'ogg', 'mov', 'avi', 
  'mkv', "flv"
]

export const AUDIO_EXTENSIONS = [
  'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a',
  "aiff", "alac", "opus"
]

/** A file in the media bucket */
export interface MediaFile {
  path: string
  url: string
  size: number | null
  createdAt: string | null
}

/** "2.4 MB", or "340 KB" under a megabyte */
export const formatBytes = (bytes: number | null) => {
  if (bytes === null) return null
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Everything in the bucket, newest first */
export async function listMedia(): Promise<MediaFile[]> {
  const supabase = createClient()
  if (!supabase) throw new Error('Supabase client not initialized.')
  const bucket = supabase.storage.from(MEDIA_BUCKET)
  // Uploads are filed under year and month, and Storage lists one folder at a time
  const walk = async (folder: string): Promise<MediaFile[]> => {
    const { data, error } = await bucket.list(folder, { limit: 1000 })
    if (error) throw new Error(error.message)
    const files = await Promise.all(
      data.map((item) => {
        const path = folder ? `${folder}/${item.name}` : item.name
        // Storage gives folders no id, and marks empty ones with a placeholder file
        if (!item.id) return walk(path)
        if (item.name === '.emptyFolderPlaceholder') return []
        return [{ path, url: bucket.getPublicUrl(path).data.publicUrl, size: item.metadata?.size ?? null, createdAt: item.created_at ?? null }]
      })
    )
    return files.flat()
  }
  return (await walk('')).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

const ofType = async (extensions: string[]) => {
  const type = new RegExp(`\\.(${extensions.join('|')})$`, 'i')
  return (await listMedia()).filter((file) => type.test(file.path))
}

export const listImages = () => ofType(IMAGE_EXTENSIONS)

export const listVideos = () => ofType(VIDEO_EXTENSIONS)

export const listAudio = () => ofType(AUDIO_EXTENSIONS)

/** Deletes a file for good; throws with a message to show */
export async function deleteMedia(path: string) {
  const supabase = createClient()
  if (!supabase) throw new Error('Supabase client not initialized.')
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).remove([path])
  if (error) throw new Error(error.message)
  // Row-level security turns a delete away by removing nothing, not with an error
  if (!data.length) throw new Error('Only officers can delete images. Try signing in again.')
}
