'use client'

import { createContext, useContext, type ComponentType } from 'react'

import type { ImagePickerProps } from './types'

export interface RichTextOptions {
  /** Stores an image and gives back its https address; throws with a message to show when it can't */
  uploadImage?: (file: File) => Promise<string>
  /** A dialog for picking an image that's already stored */
  imagePicker?: ComponentType<ImagePickerProps>
  /** Stores a document and gives back its address and a name for it; throws with a message to show */
  uploadFile?: (file: File) => Promise<{ url: string; name: string }>
  /** The file picker's accepted types (".pdf,.docx") */
  fileAccept?: string
  /** Says how an upload went, under the writing area (pasted or dropped images) */
  reportUpload: (status: UploadStatus) => void
}

export type UploadStatus = { state: 'idle' } | { state: 'uploading'; count: number; what?: 'image' | 'file' } | { state: 'failed'; message: string }

/**
 * What the editor's blocks need from the page using it (the image upload). Set by
 * RichTextEditor around the editor, so the blocks drawn inside it can read it.
 */
export const RichTextOptionsContext = createContext<RichTextOptions>({ reportUpload: () => {} })

export const useRichTextOptions = () => useContext(RichTextOptionsContext)

/** An upload's error, in words */
export const uploadMessage = (error: unknown, what = 'image') => (error instanceof Error && error.message ? error.message : `That ${what} didn’t upload. Try again?`)
