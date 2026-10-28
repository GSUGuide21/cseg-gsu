import Link from 'next/link'
import type { FC } from 'react'

import { button } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { safeHref } from '@/lib/safeUrl'

/**
 * A row of buttons: the call to action at the end of a page ("Join on PIN", "Contact
 * us"), in the site's own button styles. Up to three, each a label and a link.
 */

export type ButtonStyle = 'primary' | 'outline'
export type ButtonsAlign = 'start' | 'center'

export interface ButtonLink {
  label: string
  href: string
  style: ButtonStyle
}

export const BUTTONS_MAX = 3
export const BUTTON_LABEL_MAX = 60

/** Saved buttons, keeping only ones with words and a safe link, and at most three */
export const parseButtons = (value: unknown): ButtonLink[] => {
  if (!Array.isArray(value)) return []
  const out: ButtonLink[] = []
  for (const b of value as Partial<Record<keyof ButtonLink, unknown>>[]) {
    const label = typeof b?.label === 'string' ? b.label.trim().slice(0, BUTTON_LABEL_MAX) : ''
    const href = typeof b?.href === 'string' ? safeHref(b.href) : null
    if (label && href) out.push({ label, href, style: b.style === 'outline' ? 'outline' : 'primary' })
  }
  return out.slice(0, BUTTONS_MAX)
}

export const parseAlign = (value: unknown): ButtonsAlign => (value === 'center' ? 'center' : 'start')

const isExternal = (href: string) => /^https?:/i.test(href)

/**
 * The buttons as links, or (with `preview`, in the editor) as look-alikes that don't go
 * anywhere when clicked
 */
export const ButtonRow: FC<{ buttons: ButtonLink[]; align: ButtonsAlign; preview?: boolean }> = ({ buttons, align, preview = false }) => (
  <div className={cn('my-4 flex flex-wrap gap-3', align === 'center' && 'justify-center')}>
    {buttons.map((b, i) => {
      const className = button({ variant: b.style })
      if (preview)
        return (
          <span key={i} className={className}>
            {b.label}
          </span>
        )
      return b.href.startsWith('/') ? (
        <Link key={i} href={b.href} className={className}>
          {b.label}
        </Link>
      ) : (
        <a key={i} href={b.href} className={className} {...(isExternal(b.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {b.label}
        </a>
      )
    })}
  </div>
)
