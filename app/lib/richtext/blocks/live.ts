import { textOf } from './inline'

/**
 * Blocks drawn from what's on the site when the page is shown, not from what was saved:
 * the next events from PIN, and a place on the campus map. What's saved is only which ones.
 */

/** How many events a block shows */
export const EVENT_COUNTS = [2, 3, 4, 6] as const
export type EventCount = (typeof EVENT_COUNTS)[number]
export const parseEventCount = (v: unknown): EventCount => (EVENT_COUNTS.includes(v as EventCount) ? (v as EventCount) : 2)

/** With nothing scheduled: the most recent events instead, or a line saying so */
export type WhenNoEvents = 'recent' | 'note'
export const parseWhenNone = (v: unknown): WhenNoEvents => (v === 'note' ? 'note' : 'recent')

/** A campus map place's id: student-center-west */
export const parsePlaceId = (v: unknown): string => (typeof v === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) ? v.slice(0, 80) : '')

export const PLACE_NOTE_MAX = 200
/** A line under the place's name: "We meet in room 259, up the stairs on the left" */
export const parsePlaceNote = (v: unknown) => textOf(v, PLACE_NOTE_MAX, true)
