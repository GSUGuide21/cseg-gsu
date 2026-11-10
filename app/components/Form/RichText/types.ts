import type { ComponentType } from 'react'

/** What a page's image picker is given */
export interface ImagePickerProps {
  open: boolean
  onClose: () => void
  onPick: (src: string) => void
}

/** What the editor holds, each way it's useful */
export interface RichTextValue {
  /** Lexical's own format: lossless, so save this to edit it again later */
  json: string
  /**
   * The content as HTML, for showing it elsewhere. It can carry styles people chose (font,
   * size), so sanitize it before putting it on a public page.
   */
  html: string
  /** Just the words, for a preview, a search index, or a length check */
  text: string
  /** The same content as Portable Text (a JSON array), for tools outside this site. See lib/richtext/portableText. */
  portableText: string
}

export interface FontOption {
  label: string
  /** A CSS font-family; "" is the page's own font */
  value: string
}

export interface RichTextEditorProps {
  /** Where it starts: JSON from an earlier `onChange` (or the form's `name` field), Portable Text, HTML, or markdown */
  defaultValue?: string
  onChange?: (value: RichTextValue) => void
  /** Sent with the form: the JSON, under this name */
  name?: string
  /** Also sent with the form: the HTML, under this name */
  htmlName?: string
  /** Also sent with the form: the Portable Text, under this name */
  portableTextName?: string
  placeholder?: string
  /** The font menu. Default: the page's font, the site's two, and common ones readers already have. */
  fonts?: FontOption[]
  /** The size menu, in points. Default 8–72. */
  fontSizes?: number[]
  /** Least height of the writing area. Default "12rem". */
  minHeight?: string
  /** Shows the content without the toolbar, and no editing */
  readOnly?: boolean
  /**
   * "compact" (default): one row of tools, the rest behind ⋯. "ribbon": tabs of labeled
   * groups (Home, Insert, Format, and Table in a table), like a word processor.
   */
  toolbar?: 'compact' | 'ribbon'
  /**
   * Stores an image and resolves to its https address, or throws an Error whose message
   * says why not. With it, the Image tool can upload, and images pasted or dropped into
   * the text are uploaded; without it, images go in by their address only.
   */
  uploadImage?: (file: File) => Promise<string>
  /** A dialog for picking an image that's already stored; with it, the Image tool offers one */
  imagePicker?: ComponentType<ImagePickerProps>
  id?: string
  disabled?: boolean
  invalid?: boolean
  /** Names it when it isn't in a Field */
  'aria-label'?: string
  'aria-describedby'?: string
  className?: string
}

export type BlockType = 
  | 'paragraph' 
  | `h${1|2|3|4|5|6}`
  | 'quote' | 'callout' | 'bullet' | 'number' | 'check' | 'code'
