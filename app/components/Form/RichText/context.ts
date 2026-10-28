'use client'

import { createContext, useContext } from 'react'

export interface RichTextOptions {
  /** Stores an image and gives back its https address; throws with a message to show when it can't */
  uploadImage?: (file: File) => Promise<string>
  /** Says how an upload went, under the writing area (pasted or dropped images) */
  reportUpload: (status: UploadStatus) => void
}

export type UploadStatus = { state: 'idle' } | { state: 'uploading'; count: number } | { state: 'failed'; message: string }

/**
 * What the editor's blocks need from the page using it (the image upload). Set by
 * RichTextEditor around the editor, so the blocks drawn inside it can read it.
 */
export const RichTextOptionsContext = createContext<RichTextOptions>({ reportUpload: () => {} })

export const useRichTextOptions = () => useContext(RichTextOptionsContext)

/** An upload's error, in words */
export const uploadMessage = (error: unknown) => (error instanceof Error && error.message ? error.message : 'That image didn’t upload. Try again?')
