/**
 * How far apart a paragraph's lines are. Left out, a block keeps the site's own spacing
 * (roomy, for reading on screens); these are for a block that should be tighter or looser.
 */

export const LINE_HEIGHTS = {
  '1': 'Single',
  '1.15': '1.15',
  '1.5': '1.5',
  '2': 'Double',
} as const

export type LineHeight = keyof typeof LINE_HEIGHTS

export const LINE_HEIGHT_LIST = Object.keys(LINE_HEIGHTS) as LineHeight[]

/** A saved spacing, or "" for the usual */
export const parseLineHeight = (value: unknown): LineHeight | '' => (typeof value === 'string' && Object.hasOwn(LINE_HEIGHTS, value) ? (value as LineHeight) : '')
