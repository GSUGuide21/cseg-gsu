'use client'

import { useState, type FC, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Button } from '../../Button'
import { Popover } from '../../Popover'
import { ColorPanel } from '../ColorPicker'
import { parseColorWithAlpha } from '../ColorPicker/color'
import type { Swatch } from '../ColorPicker/types'

/** Text, underline, and border colors: mid tones that read on light and dark pages alike */
export const INK_SWATCHES: Swatch[] = [
  { color: '#111827', name: 'Black' },
  { color: '#6b7280', name: 'Gray' },
  { color: '#dc2626', name: 'Red' },
  { color: '#ea580c', name: 'Orange' },
  { color: '#d97706', name: 'Amber' },
  { color: '#16a34a', name: 'Green' },
  { color: '#0d9488', name: 'Teal' },
  { color: '#0039a6', name: 'Georgia State blue' },
  { color: '#0284c7', name: 'Sky' },
  { color: '#7c3aed', name: 'Violet' },
  { color: '#db2777', name: 'Pink' },
  { color: '#ffffff', name: 'White' },
]

/**
 * Backgrounds: the same kind of hues, picked at the tint's opacity (a new background starts
 * at 35%), so the text on them stays readable in either theme
 */
export const TINT_SWATCHES: Swatch[] = [
  { color: '#facc15', name: 'Yellow' },
  { color: '#fb923c', name: 'Orange' },
  { color: '#f87171', name: 'Red' },
  { color: '#f472b6', name: 'Pink' },
  { color: '#a78bfa', name: 'Violet' },
  { color: '#60a5fa', name: 'Blue' },
  { color: '#2dd4bf', name: 'Teal' },
  { color: '#4ade80', name: 'Green' },
  { color: '#94a3b8', name: 'Gray' },
  { color: '#e5e7eb', name: 'Light gray' },
  { color: '#111827', name: 'Black' },
  { color: '#ffffff', name: 'White' },
]

/** A swatch's name for a color, ignoring opacity ("Yellow" for #facc1559) */
const nameOf = (color: string, swatches: Swatch[]) => {
  const hex = parseColorWithAlpha(color)?.hex
  const hit = hex && swatches.find((s) => typeof s !== 'string' && s.color.toLowerCase() === hex)
  return hit && typeof hit !== 'string' ? hit.name : null
}

/**
 * A toolbar button that colors the selection, with the site's color panel: the square, hue
 * (and opacity) bars, presets, and exact values. The color applies as it changes, so the
 * text shows it while dragging; Done goes back to writing, None takes it off. The bar under
 * the icon shows the color the cursor's text has now.
 */
export const ColorTool: FC<{
  label: string
  icon: ReactNode
  /** The selection's color now ("" for none, or mixed) */
  current: string
  swatches: Swatch[]
  /** Lets the color be see-through (backgrounds) */
  alpha?: boolean
  /** Where the panel starts when there's no color yet */
  start: string
  /** `live` is set while the color is still being chosen; don't move focus then */
  onPick: (color: string | null, live?: boolean) => void
  disabled?: boolean
  /** Shows the label beside the icon (the ribbon's Format tab) */
  labeled?: boolean
}> = ({ label, icon, current, swatches, alpha = false, start, onPick, disabled, labeled = false }) => {
  const [open, setOpen] = useState(false)
  const name = current ? (nameOf(current, swatches) ?? current) : null
  const done = () => {
    setOpen(false)
    // Back to writing, where the cursor was
    onPick(current || null)
  }
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      title={label}
      trigger={
        <button
          type="button"
          data-tool
          disabled={disabled}
          aria-label={`${label}${name ? `: ${name}` : ''}`}
          className={cn(
            'relative shrink-0 cursor-pointer rounded-md text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-4',
            labeled ? 'flex h-8 items-center gap-2 pr-2.5 pl-2 text-[0.8rem] font-semibold' : 'grid size-8 place-items-center'
          )}
        >
          {icon}
          {/* The color now, as a bar under the icon */}
          <span
            aria-hidden
            className={cn('absolute bottom-1 h-1 rounded-full', labeled ? 'left-2 w-4' : 'inset-x-1.5', current ? '' : 'border border-dashed border-ink-faint/60')}
            style={current ? { background: current } : undefined}
          />
          {labeled ? <span aria-hidden>{label}</span> : null}
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <ColorPanel value={current || start} onValueChange={(c) => onPick(c, true)} swatches={swatches} alpha={alpha} />
        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
          <Button
            size="sm"
            variant="ghost"
            disabled={!current}
            onClick={() => {
              setOpen(false)
              onPick(null)
            }}
          >
            None
          </Button>
          <Button size="sm" onClick={done}>
            Done
          </Button>
        </div>
      </div>
    </Popover>
  )
}
