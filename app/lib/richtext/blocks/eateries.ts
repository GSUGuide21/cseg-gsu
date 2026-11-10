import { EATERY_KINDS, type EateryKind } from '@/lib/eateries'
import { eateriesRef, type ReferenceItem } from '@/lib/references'

/**
 * Eateries blocks, from before they were a kind of reference: saved as
 * { type: 'eateries', area, kind }, now { type: 'reference', items: [{ kind: 'eateries', ref }] }.
 * The editor upgrades them as a document opens (saved with its next save); until then the
 * site draws them as the reference they became.
 */

type Node = { type?: string; children?: Node[]; [key: string]: unknown }

/** An old Eateries block as the reference it became; null without an area (one that's gone shows nothing) */
export const legacyEateriesItem = (area: unknown, kind: unknown): ReferenceItem | null =>
  typeof area === 'string' && /^[a-z0-9-]+$/.test(area) ? { kind: 'eateries', ref: eateriesRef(area, typeof kind === 'string' && Object.hasOwn(EATERY_KINDS, kind) ? (kind as EateryKind) : 'all') } : null

/** Saved writing with its old Eateries blocks made References blocks; anything else comes back as it was */
export function upgradeEateriesBlocks(source: string): string {
  if (!source.includes('"type":"eateries"')) return source
  let root: Node
  try {
    root = (JSON.parse(source) as { root: Node }).root
  } catch {
    return source
  }
  const upgrade = (n: Node): Node => {
    if (n.type === 'eateries') {
      const item = legacyEateriesItem(n.area, n.kind)
      return { type: 'reference', version: 1, items: item ? [item] : [] }
    }
    return n.children ? { ...n, children: n.children.map(upgrade) } : n
  }
  return JSON.stringify({ ...(JSON.parse(source) as object), root: upgrade(root) })
}

/** What's drawn live from the site: References, upcoming events, map places, chips, and old Eateries blocks */
const LIVE_TYPES = ['reference', 'eateries', 'events', 'place', 'chip']

/** Whether saved writing (Lexical JSON or Portable Text) has something drawn live from the site, so it needs SiteContent */
export const hasLiveBlock = (...sources: string[]) => sources.some((s) => LIVE_TYPES.some((t) => s.includes(`"type":"${t}"`) || s.includes(`"_type":"${t}"`)))
