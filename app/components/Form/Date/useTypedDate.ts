'use client'

import { useState } from 'react'

import { formatDate, parseDate, type ISODate } from './utils'

/**
 * A text box holding a date someone can type. While they type, the text is theirs; on
 * `commit` (blur or Enter) it's read: an empty box clears the date, a readable allowed
 * date is kept, and anything else stays in the box marked `unreadable` so it can be fixed.
 */
export function useTypedDate(value: ISODate | null, locale: string, allowed: (iso: ISODate) => boolean) {
  const [draft, setDraft] = useState<string | null>(null)
  const [unreadable, setUnreadable] = useState(false)

  return {
    text: draft ?? (value ? formatDate(value, locale) : ''),
    unreadable,
    /** Whether there's typing waiting to be read */
    typing: draft !== null,
    type: setDraft,
    /** Reads the box; calls `onDate` with the date (null for empty) when it's usable */
    commit(text: string, onDate: (iso: ISODate | null) => void) {
      const iso = text.trim() ? parseDate(text, locale) : null
      if (text.trim() && !(iso && allowed(iso))) return setUnreadable(true)
      setDraft(null)
      setUnreadable(false)
      onDate(iso)
    },
    /** Forget any typing, e.g. after a pick from the calendar */
    reset() {
      setDraft(null)
      setUnreadable(false)
    },
  }
}
