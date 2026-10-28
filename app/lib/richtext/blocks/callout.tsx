import { Icon, type IconNode } from 'lucide-react'
import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * A callout: a tinted box with an icon, for a note the reader shouldn't miss (when
 * something was last checked, a heads-up, a tip). The editor draws it from these same
 * classes and icons, so it looks the same there as on the site.
 */

export type CalloutTone = 'info' | 'tip' | 'warning'

/** Each part gets a React key, as Lucide's own icons have (the editor's copy skips it) */
const keyed = (icon: IconNode): IconNode => icon.map(([tag, attrs], i) => [tag, { ...attrs, key: String(i) }])

/** Lucide's Info, Lightbulb, and TriangleAlert, as data: the editor builds them without React */
const INFO = keyed([
  ['circle', { cx: '12', cy: '12', r: '10' }],
  ['path', { d: 'M12 16v-4' }],
  ['path', { d: 'M12 8h.01' }],
])
const LIGHTBULB = keyed([
  ['path', { d: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5' }],
  ['path', { d: 'M9 18h6' }],
  ['path', { d: 'M10 22h4' }],
])
const TRIANGLE_ALERT = keyed([
  ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' }],
  ['path', { d: 'M12 9v4' }],
  ['path', { d: 'M12 17h.01' }],
])

export const CALLOUT_TONES: Record<CalloutTone, { label: string; icon: IconNode; box: string; tile: string }> = {
  info: { label: 'Note', icon: INFO, box: 'border-brand-edge bg-brand-wash', tile: 'bg-brand-tint text-brand' },
  tip: { label: 'Tip', icon: LIGHTBULB, box: 'border-success/35 bg-success/8', tile: 'bg-success/15 text-success' },
  warning: { label: 'Heads up', icon: TRIANGLE_ALERT, box: 'border-warning/40 bg-warning/10', tile: 'bg-warning/15 text-warning' },
}

export const CALLOUT_TONE_LIST = Object.keys(CALLOUT_TONES) as CalloutTone[]

/** A saved tone, or "info" for anything else */
export const parseTone = (value: unknown): CalloutTone => (typeof value === 'string' && value in CALLOUT_TONES ? (value as CalloutTone) : 'info')

/** The box, the icon's tile, and the words beside it */
export const calloutClasses = (tone: CalloutTone) => ({
  box: cn('my-3 flex items-start gap-3 rounded-[0.875rem] border p-4 text-ink-soft', CALLOUT_TONES[tone].box),
  tile: cn('grid size-8 shrink-0 place-items-center rounded-lg [&>svg]:size-[18px]', CALLOUT_TONES[tone].tile),
  body: 'min-w-0 flex-1 self-center leading-[1.7]',
})

export const Callout: FC<{ tone: CalloutTone; children: ReactNode }> = ({ tone, children }) => {
  const c = calloutClasses(tone)
  return (
    <div role="note" aria-label={CALLOUT_TONES[tone].label} className={c.box}>
      <span className={c.tile} aria-hidden>
        <Icon iconNode={CALLOUT_TONES[tone].icon} />
      </span>
      <div className={c.body}>{children}</div>
    </div>
  )
}
