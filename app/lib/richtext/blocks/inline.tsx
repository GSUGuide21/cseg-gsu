import Link from 'next/link'
import type { FC, ReactNode } from 'react'

import { safeHref } from '@/lib/safeUrl'

/**
 * The short text inside a block (an FAQ answer, a step, a card): plain words, where
 * **bold** and [a link](https://…) work and a new line is a line break. Nothing else is
 * read, and links go only where safeHref allows.
 */

const TOKENS = /\*\*(.+?)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)|\n/g

const linkClass = 'text-brand underline underline-offset-2'

export const InlineText: FC<{ text: string }> = ({ text }) => {
  const out: ReactNode[] = []
  let at = 0
  for (const m of text.matchAll(TOKENS)) {
    if (m.index > at) out.push(text.slice(at, m.index))
    const key = m.index
    if (m[1] !== undefined) out.push(<strong key={key} className="font-bold text-ink">{m[1]}</strong>)
    else if (m[2] !== undefined) {
      const href = safeHref(m[3])
      if (!href) out.push(m[2])
      else if (href.startsWith('/'))
        out.push(
          <Link key={key} href={href} className={linkClass}>
            {m[2]}
          </Link>
        )
      else
        out.push(
          <a key={key} href={href} className={linkClass} {...(/^https?:/i.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {m[2]}
          </a>
        )
    } else out.push(<br key={key} />)
    at = m.index + m[0].length
  }
  if (at < text.length) out.push(text.slice(at))
  return <>{out}</>
}

/** The words alone: "**Free** [food](/eat)" → "Free food" */
export const inlinePlain = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, '$1')

/** A saved piece of text: a string, trimmed and cut to `max` (new lines kept, for multi-line fields) */
export const textOf = (value: unknown, max: number, lines = false) =>
  typeof value === 'string' ? (lines ? value.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n') : value.replace(/\s+/g, ' ')).trim().slice(0, max) : ''

/** A saved list: up to `max` items, each read by `item`, dropping the ones it turns away */
export const listOf = <T,>(value: unknown, max: number, item: (raw: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(value) ? value : [])
    .map((raw) => (raw && typeof raw === 'object' ? item(raw as Record<string, unknown>) : null))
    .filter((x): x is T => x !== null)
    .slice(0, max)

/** The hint shown under fields that take this text */
export const INLINE_HINT = '**bold** and [a link](https://…) work.'
