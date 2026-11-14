import { Download, FileText } from 'lucide-react'
import type { FC } from 'react'

import { safeSrc } from '@/lib/safeUrl'

import { textOf } from './inline'

/**
 * A file to open or download: a flyer, a form, the constitution as a PDF. It's a link to
 * where the file is kept (the club's storage, Google Drive, a page here), shown as a card
 * with the file's name and kind.
 */

export type FileData = {
  /** Where the file is: https, or a path on this site */
  href: string
  name: string
  /** A line under the name: what it's for */
  note: string
}

export const FILE_NAME_MAX = 100
export const FILE_NOTE_MAX = 160

export const parseFileHref = (value: unknown) => (typeof value === 'string' ? (safeSrc(value) ?? '') : '')
export const parseFileName = (value: unknown) => textOf(value, FILE_NAME_MAX)
export const parseFileNote = (value: unknown) => textOf(value, FILE_NOTE_MAX)

const KINDS: Record<string, string> = {
  pdf: 'PDF',
  doc: 'Word document',
  docx: 'Word document',
  xls: 'Spreadsheet',
  xlsx: 'Spreadsheet',
  csv: 'Spreadsheet',
  ppt: 'Slides',
  pptx: 'Slides',
  zip: 'Zip archive',
  txt: 'Text file',
  ics: 'Calendar file',
  png: 'Image',
  jpg: 'Image',
  jpeg: 'Image',
}

/** What kind of file an address points at, from how it ends; "" when it doesn't say */
export const fileKind = (href: string) => {
  const ext = /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(href.split('/').pop() ?? '')?.[1]?.toLowerCase()
  return ext ? (KINDS[ext] ?? ext.toUpperCase()) : ''
}

/** A name to show when none was given: the file's own, from its address */
export const fileNameFrom = (href: string) => {
  try {
    return decodeURIComponent((href.split(/[?#]/)[0].split('/').pop() ?? '').replace(/[-_]+/g, ' ')).trim()
  } catch {
    return ''
  }
}

export const FileCard: FC<FileData & { preview?: boolean }> = ({ href, name, note, preview = false }) => {
  const kind = fileKind(href)
  const body = (
    <>
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-tint text-brand">
        <FileText size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-bold wrap-anywhere text-ink">{name || fileNameFrom(href) || 'File'}</span>
        <span className="text-[0.85rem] text-muted">{[kind, note].filter(Boolean).join(' · ') || 'Opens in a new tab'}</span>
      </span>
      <Download aria-hidden size={18} className="shrink-0 text-muted" />
    </>
  )
  const box = 'my-5 flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 no-underline'
  // In the editor a click selects the block rather than opening the file
  return preview ? (
    <div className={box}>{body}</div>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${box} transition-colors hover:border-brand/50 hover:bg-brand-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}>
      {body}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}
