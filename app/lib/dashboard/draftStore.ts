/**
 * Work in the editor not yet saved, kept in this browser so a crash or a closed laptop doesn't
 * lose it. Browsers can refuse storage (private windows, full disks), and that shouldn't stop
 * anyone writing, so a read gives null and a write does nothing.
 */
export interface StoredDraft {
  savedAt: number
  /** The editor's snapshot of everything in it */
  snapshot: string
}

const keyFor = (kind: 'post' | 'page' | 'presentation', id: string | null) => `cseg:draft:${kind}:${id ?? 'new'}`

export const readDraft = (kind: 'post' | 'page' | 'presentation', id: string | null): StoredDraft | null => {
  try {
    const stored = window.localStorage.getItem(keyFor(kind, id))
    const draft = stored ? (JSON.parse(stored) as Partial<StoredDraft>) : null
    return draft && typeof draft.savedAt === 'number' && typeof draft.snapshot === 'string' ? { savedAt: draft.savedAt, snapshot: draft.snapshot } : null
  } catch {
    return null
  }
}

export const writeDraft = (kind: 'post' | 'page' | 'presentation', id: string | null, snapshot: string) => {
  try {
    window.localStorage.setItem(keyFor(kind, id), JSON.stringify({ savedAt: Date.now(), snapshot }))
  } catch {
    // Out of room, or storage is off: the warning on leaving still stands
  }
}

export const clearDraft = (kind: 'post' | 'page' | 'presentation', id: string | null) => {
  try {
    window.localStorage.removeItem(keyFor(kind, id))
  } catch {
    // Nothing to clear, then
  }
}
