/* eslint-disable @next/next/no-img-element -- images can be from any site, at any size */
import Link from 'next/link'
import type { FC } from 'react'

import { Badge } from '@/components/Badge'
import { button } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { safeHref, safeSrc } from '@/lib/safeUrl'

import { textOf } from './inline'

/**
 * The items that sit inside a line of text, between words: a button, an image, a badge, a
 * date or time, and a chip (globals/InlineChip, as it's drawn live). Footnotes are here too;
 * their numbers and list are RichContent's, as they depend on the whole document.
 */

// ── Button ───────────────────────────────────────────────────────────────────

export const INLINE_BUTTON_LABEL_MAX = 40

export type InlineButtonStyle = 'primary' | 'outline'

export interface InlineButtonData extends Record<string, unknown> {
  label: string
  href: string
  buttonStyle: InlineButtonStyle
}

export const parseInlineLabel = (v: unknown) => textOf(v, INLINE_BUTTON_LABEL_MAX)
export const parseInlineHref = (v: unknown) => (typeof v === 'string' ? (safeHref(v) ?? '') : '')
export const parseInlineButtonStyle = (v: unknown): InlineButtonStyle => (v === 'outline' ? 'outline' : 'primary')

/** A small button in a sentence; with `preview`, in the editor, a look-alike that goes nowhere */
export const InlineButton: FC<InlineButtonData & { preview?: boolean }> = ({ label, href, buttonStyle, preview }) => {
  // Sized to the line, not the page's: its text beside it stays where it was
  const className = cn(button({ size: 'sm', variant: buttonStyle }), 'mx-0.5 rounded-md border px-2 py-0 align-baseline text-[0.85em] leading-snug')
  if (preview) return <span className={className}>{label}</span>
  if (href.startsWith('/'))
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    )
  return (
    <a href={href} className={className} {...(/^https?:/i.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {label}
    </a>
  )
}

// ── Image ────────────────────────────────────────────────────────────────────

export const INLINE_IMAGE_ALT_MAX = 200

export interface InlineImageData extends Record<string, unknown> {
  src: string
  alt: string
}

export const parseInlineSrc = (v: unknown) => (typeof v === 'string' ? (safeSrc(v) ?? '') : '')
export const parseInlineAlt = (v: unknown) => textOf(v, INLINE_IMAGE_ALT_MAX)

/** A picture the height of the line it's in: a logo, an icon */
export const InlineImage: FC<InlineImageData> = ({ src, alt }) => <img src={src} alt={alt} className="mx-0.5 inline-block h-[1.4em] w-auto max-w-full align-text-bottom" />

// ── Badge ────────────────────────────────────────────────────────────────────

export const INLINE_BADGE_MAX = 30

export const BADGE_TONES = { neutral: 'Gray', brand: 'Blue', success: 'Green', warning: 'Amber', danger: 'Red' } as const
export type BadgeTone = keyof typeof BADGE_TONES

export interface InlineBadgeData extends Record<string, unknown> {
  label: string
  tone: BadgeTone
}

export const parseBadgeLabel = (v: unknown) => textOf(v, INLINE_BADGE_MAX)
export const parseBadgeTone = (v: unknown): BadgeTone => (typeof v === 'string' && Object.hasOwn(BADGE_TONES, v) ? (v as BadgeTone) : 'brand')

export const InlineBadge: FC<InlineBadgeData> = ({ label, tone }) => (
  <Badge size="sm" tone={tone} className="mx-0.5 align-baseline">
    {label}
  </Badge>
)

// ── Date or time ─────────────────────────────────────────────────────────────

export type DateTimeStyle = 'short' | 'long'

export interface DateTimeData extends Record<string, unknown> {
  /** "YYYY-MM-DD" */
  date: string
  /** "HH:mm", or "" for a date alone */
  time: string
  dateStyle: DateTimeStyle
}

export const parseDate = (v: unknown) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return ''
  // new Date rolls Feb 30 over to March: a real date comes back as it went in
  return new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v ? v : ''
}
export const parseTime = (v: unknown) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : '')
export const parseDateStyle = (v: unknown): DateTimeStyle => (v === 'long' ? 'long' : 'short')

/**
 * What was picked, as written: "Mon, Oct 12 · 6:00 PM". It's the clock on campus, not a
 * moment, so it reads the same for everyone: UTC in and out only keeps any zone from
 * shifting it, and the server and the browser agree.
 */
export const dateTimeText = ({ date, time, dateStyle }: DateTimeData) => {
  if (!date) return ''
  const when = new Date(`${date}T${time || '00:00'}:00Z`)
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...(dateStyle === 'long' ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' }) }).format(when)
  return time ? `${day} · ${new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }).format(when)}` : day
}

export const InlineDateTime: FC<DateTimeData> = (data) => (
  <time dateTime={data.time ? `${data.date}T${data.time}` : data.date} className="font-semibold text-ink">
    {dateTimeText(data)}
  </time>
)

// ── Footnote ─────────────────────────────────────────────────────────────────

export const FOOTNOTE_MAX = 500

export const parseFootnote = (v: unknown) => textOf(v, FOOTNOTE_MAX, true)

/** A footnote's number in the text, in the editor and on the page */
export const footnoteMark = 'mx-px cursor-pointer font-bold text-brand no-underline'

// ── Chip ─────────────────────────────────────────────────────────────────────

export const CHIP_KINDS = { place: 'Map place', event: 'Event', post: 'Post', page: 'Page', eatery: 'Eatery', resource: 'Resource' } as const
export type ChipKind = keyof typeof CHIP_KINDS

export const CHIP_LABEL_MAX = 120

export interface ChipData extends Record<string, unknown> {
  kind: ChipKind
  /** Which one: its id or slug */
  target: string
  /** Its name when it was picked, for when it's gone: the sentence still reads */
  label: string
}

export const parseChipKind = (v: unknown): ChipKind => (typeof v === 'string' && Object.hasOwn(CHIP_KINDS, v) ? (v as ChipKind) : 'place')
export const parseChipTarget = (v: unknown) => textOf(v, 500)
export const parseChipLabel = (v: unknown) => textOf(v, CHIP_LABEL_MAX)
