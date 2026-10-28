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
