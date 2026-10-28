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
}

export interface FontOption {
  label: string
  /** A CSS font-family; "" is the page's own font */
  value: string
}

export interface RichTextEditorProps {
  /** Where it starts: JSON from an earlier `onChange` (or the form's `name` field), or HTML */
  defaultValue?: string
  onChange?: (value: RichTextValue) => void
  /** Sent with the form: the JSON, under this name */
  name?: string
  /** Also sent with the form: the HTML, under this name */
  htmlName?: string
  placeholder?: string
  /** The font menu. Default: the page's font, Montserrat, Georgia, Times, Arial, and monospace. */
  fonts?: FontOption[]
  /** The size menu, in pixels. Default 12–40. */
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
  id?: string
  disabled?: boolean
  invalid?: boolean
  /** Names it when it isn't in a Field */
  'aria-label'?: string
  'aria-describedby'?: string
  className?: string
}

export type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'quote' | 'callout' | 'bullet' | 'number' | 'code'
