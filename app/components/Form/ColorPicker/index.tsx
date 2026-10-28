'use client'

import { Check, Pipette } from 'lucide-react'
import { useId, useState, type CSSProperties, type FC } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControl } from '../Field'
import { control, controlButton, controlInput, panel } from '../Input/variants'
import { SliderTrack } from '../Slider/Track'
import { useControllable } from '../useControllable'
import { useMediaQuery } from '../useMediaQuery'
import { popoverPlacement, usePopover } from '../usePopover'
import { ColorCanvas } from './Canvas'
import { contrastText, hexToHsv, hsvToHex, parseColor, parseColorWithAlpha, withAlpha, type HSV } from './color'
import { ColorPickerContext, useColorPicker } from './Context'
import { ColorDetails } from './Details'
import type { ColorPanelProps, ColorPickerContextValue, ColorPickerProps, Swatch } from './types'

/** GSU blue, its light tint, and the site's category colors */
export const DEFAULT_SWATCHES: readonly Swatch[] = [
  { color: '#0039a6', name: 'GSU blue' },
  { color: '#6d9bff', name: 'Light blue' },
  { color: '#0891b2', name: 'Cyan' },
  { color: '#0f766e', name: 'Teal' },
  { color: '#15803d', name: 'Green' },
  { color: '#ca8a04', name: 'Gold' },
  { color: '#c2410c', name: 'Orange' },
  { color: '#b91c1c', name: 'Red' },
  { color: '#be185d', name: 'Pink' },
  { color: '#7c3aed', name: 'Purple' },
  { color: '#475569', name: 'Slate' },
  { color: '#0f1729', name: 'Navy' },
]

const HUE_TRACK = {
  background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
}

/** The gray-and-white squares that show through a see-through color */
export const CHECKERBOARD = 'repeating-conic-gradient(#d4d4d8 0 25%, #ffffff 0 50%) 0 0 / 10px 10px'

/** A color painted over the checkerboard, so its opacity shows */
export const colorOverChecks = (color: string): CSSProperties => ({
  background: `linear-gradient(${color}, ${color}), ${CHECKERBOARD}`,
})

/** The browser's eyedropper (Chromium only), for picking a color off the screen */
type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> }
const eyeDropper = () => (typeof window !== 'undefined' ? (window as { EyeDropper?: EyeDropperCtor }).EyeDropper : undefined)

const HueBar: FC = () => {
  const { hsv, setHsv } = useColorPicker()
  return (
    <SliderTrack
      values={[Math.round(hsv.h)]}
      onValuesChange={([h]) => setHsv({ ...hsv, h })}
      min={0}
      max={360}
      fill={false}
      trackStyle={HUE_TRACK}
      thumbLabels={['Hue']}
      formatValue={(h) => `${h}°`}
      // In the bars' column a track keeps its own height (flex-1 would collapse it)
      className="flex-none"
    />
  )
}

/** Opacity, from clear (left) to solid (right), over the checkerboard */
const AlphaBar: FC = () => {
  const { hex, alpha, setAlpha } = useColorPicker()
  return (
    <SliderTrack
      values={[Math.round((alpha ?? 1) * 100)]}
      onValuesChange={([a]) => setAlpha(a / 100)}
      min={0}
      max={100}
      fill={false}
      trackStyle={{ background: `linear-gradient(to right, ${hex}00, ${hex}), ${CHECKERBOARD}` }}
      thumbLabels={['Opacity']}
      formatValue={(a) => `${a}%`}
      className="flex-none"
    />
  )
}

type PanelTab = 'pick' | 'details'
const TABS: readonly [PanelTab, string][] = [
  ['pick', 'Pick'],
  ['details', 'Details'],
]

/** Pick | Details, on phones only. Arrow keys switch tabs, as tabs do; Tab moves into the panel. */
const Tabs: FC<{ tab: PanelTab; onTab: (t: PanelTab) => void; panelId: string }> = ({ tab, onTab, panelId }) => (
  <div
    role="tablist"
    aria-label="Color panel"
    className="grid grid-cols-2 gap-1 rounded-lg bg-fill p-1"
    onKeyDown={(e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const next = tab === 'pick' ? 'details' : 'pick'
      onTab(next)
      document.getElementById(`${panelId}-${next}`)?.focus()
    }}
  >
    {TABS.map(([value, label]) => (
      <button
        key={value}
        id={`${panelId}-${value}`}
        type="button"
        role="tab"
        aria-selected={tab === value}
        aria-controls={panelId}
        tabIndex={tab === value ? 0 : -1}
        onClick={() => onTab(value)}
        className="cursor-pointer rounded-md py-1 text-[0.8rem] font-semibold text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-brand aria-selected:bg-surface aria-selected:text-brand aria-selected:shadow-[0_1px_3px_rgb(0_0_0/0.1)]"
      >
        {label}
      </button>
    ))}
  </div>
)

/** Six to a row in a narrow panel; one row of twelve across a wide one */
const Swatches: FC<{ colors: readonly Swatch[]; wide?: boolean }> = ({ colors, wide = false }) => {
  const { hex, setSolid } = useColorPicker()
  return (
    <div className={cn('grid gap-1.5', wide ? 'grid-cols-12' : 'grid-cols-6')} role="group" aria-label="Preset colors">
      {colors.map((s) => {
        const raw = typeof s === 'string' ? s : s.color
        const color = parseColor(raw) ?? raw
        const name = typeof s === 'string' ? undefined : s.name
        const on = color === hex
        return (
          <button
            key={color}
            type="button"
            onClick={() => setSolid(color)}
            aria-label={name ? `${name}, ${color.toUpperCase()}` : color.toUpperCase()}
            title={name ?? color.toUpperCase()}
            aria-pressed={on}
            style={{ backgroundColor: color }}
            className="grid aspect-square cursor-pointer place-items-center rounded-md border border-black/10 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
          >
            {on ? <Check size={14} strokeWidth={3} color={contrastText(color)} aria-hidden /> : null}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The color both the field and the inline panel hold: the value as reported ("#rrggbb", or
 * "#rrggbbaa" with alpha), with HSV kept alongside so hue survives grays and blacks, where
 * hex can't say it. `onEdit` runs after each change (the field uses it to drop its typing).
 */
function useColorValue({
  value: valueProp,
  defaultValue,
  onValueChange,
  alphaOn,
  onEdit,
}: {
  value: string | undefined
  defaultValue: string
  onValueChange: ((value: string) => void) | undefined
  alphaOn: boolean
  onEdit?: () => void
}) {
  /** The value as reported: "#rrggbb", or "#rrggbbaa" when alpha is on */
  const write = (hex: string, alpha: number) => (alphaOn ? withAlpha(hex, alpha) : hex)
  const read = (text: string | undefined) => {
    const c = text === undefined ? null : parseColorWithAlpha(text)
    return c ? write(c.hex, c.alpha) : write('#000000', 1)
  }

  // Whatever color format comes in, the picker works (and reports) in hex
  const [value, setValue] = useControllable(valueProp === undefined ? undefined : read(valueProp), read(defaultValue), onValueChange)
  const parsed = parseColorWithAlpha(value) ?? { hex: '#000000', alpha: 1 }
  const hex = parsed.hex
  const alpha = alphaOn ? parsed.alpha : 1

  const [hsvState, setHsvState] = useState<HSV>(() => hexToHsv(hex))
  const hsv = hsvToHex(hsvState) === hex ? hsvState : hexToHsv(hex)

  const setHsv = (next: HSV) => {
    setHsvState(next)
    setValue(write(hsvToHex(next), alpha))
    onEdit?.()
  }
  const setSolid = (next: string) => {
    setHsvState(hexToHsv(next))
    setValue(write(next, alpha))
    onEdit?.()
  }
  const setAlpha = (next: number) => setValue(write(hex, Math.min(1, Math.max(0, next))))
  /** Takes any color the picker reads; its own alpha counts only when alpha is on */
  const setHex = (text: string) => {
    const c = parseColorWithAlpha(text)
    // Without alpha, a fully clear color has nothing to show
    if (!c || (!alphaOn && c.alpha === 0)) return false
    setHsvState(hexToHsv(c.hex))
    setValue(write(c.hex, alphaOn ? c.alpha : 1))
    onEdit?.()
    return true
  }
  const context: ColorPickerContextValue = { hsv, hex, alpha: alphaOn ? alpha : null, setHsv, setHex, setSolid, setAlpha }
  return { value, hex, context }
}

/**
 * What's in a color panel: the square, the hue (and opacity) bars, the eyedropper, and the
 * presets, then the exact values. Wide, all of it at once; narrow, Pick and Details tabs.
 * Reads the color from the context around it.
 */
const PanelBody: FC<{ wide: boolean; alphaOn: boolean; swatches: readonly Swatch[]; panelId: string }> = ({ wide, alphaOn, swatches, panelId }) => {
  const { hex, setSolid } = useColorPicker()
  const [tab, setTab] = useState<PanelTab>('pick')
  const Dropper = eyeDropper()

  const square = <ColorCanvas id={`${panelId}-square`} className={wide ? 'h-44' : undefined} />

  // The hue (and opacity) bars, eyedropper, and presets, under the square
  const controls = (
    <>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <HueBar />
          {alphaOn ? <AlphaBar /> : null}
        </div>
        {Dropper ? (
          <button
            type="button"
            aria-label="Pick a color from the screen"
            className={controlButton}
            onClick={async () => {
              try {
                setSolid(parseColor((await new Dropper().open()).sRGBHex) ?? hex)
              } catch {
                // Cancelled with Escape
              }
            }}
          >
            <Pipette size={16} aria-hidden />
          </button>
        ) : null}
      </div>
      {swatches.length ? <Swatches colors={swatches} wide={wide} /> : null}
    </>
  )

  return wide ? (
    <>
      {/* Everything runs across the whole panel: square, bars, presets, then the details in rows */}
      {square}
      {controls}
      <div className="border-t border-line pt-3">
        <ColorDetails layout="wide" />
      </div>
    </>
  ) : (
    <>
      <Tabs tab={tab} onTab={setTab} panelId={`${panelId}-panel`} />
      <div id={`${panelId}-panel`} role="tabpanel" aria-labelledby={`${panelId}-panel-${tab}`} className="flex flex-col gap-3">
        {tab === 'pick' ? (
          <>
            {square}
            {controls}
          </>
        ) : (
          <ColorDetails />
        )}
      </div>
    </>
  )
}

/**
 * The color panel on its own, for a place that already has its own popover or card (the
 * rich text editor's color buttons, a settings page). Same square, bars, presets, and exact
 * values as the ColorPicker's panel; reports "#rrggbb", or "#rrggbbaa" with `alpha`, as it
 * changes (while dragging, too).
 *
 *   <ColorPanel value={color} onValueChange={setColor} swatches={brandColors} />
 */
export const ColorPanel: FC<ColorPanelProps> = ({ value, defaultValue = '#0039a6', onValueChange, alpha = false, swatches = DEFAULT_SWATCHES, layout = 'narrow', className }) => {
  const color = useColorValue({ value, defaultValue, onValueChange, alphaOn: alpha })
  const panelId = useId()
  return (
    <ColorPickerContext.Provider value={color.context}>
      <div className={cn('flex flex-col gap-3', layout === 'wide' ? 'w-120 max-w-full' : 'w-58 max-w-full', className)}>
        <PanelBody wide={layout === 'wide'} alphaOn={alpha} swatches={swatches} panelId={panelId} />
      </div>
    </ColorPickerContext.Provider>
  )
}

/**
 * A color, as "#rrggbb" (or "#rrggbbaa" with `alpha`). Type one (hex, rgb(), hsl(), or a
 * CSS name like "teal"), or open the panel to drag through the color square and hue bar
 * (and opacity bar), choose a preset, pick from the screen (Chromium), or set exact red,
 * green, blue, hue, saturation, lightness, and alpha values. Typing that can't be read
 * stays in the box, marked invalid; Escape puts the last good color back.
 *
 *   <Field label="Event color"><ColorPicker name="color" defaultValue="#0039a6" /></Field>
 *   <Field label="Overlay"><ColorPicker alpha defaultValue="rgb(0 0 0 / 40%)" /></Field>
 *
 * Floating labels aren't supported (the swatch sits where the label would rest).
 */
export const ColorPicker: FC<ColorPickerProps> = ({
  value: valueProp,
  defaultValue = '#0039a6',
  onValueChange,
  alpha: alphaOn = false,
  swatches = DEFAULT_SWATCHES,
  name,
  size = 'md',
  id,
  disabled,
  required,
  invalid,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
}) => {
  // Typing in the box, and whether it could be read
  const [draft, setDraft] = useState<string | null>(null)
  const [unreadable, setUnreadable] = useState(false)
  const forgetTyping = () => {
    setDraft(null)
    setUnreadable(false)
  }
  const { value, context } = useColorValue({ value: valueProp, defaultValue, onValueChange, alphaOn, onEdit: forgetTyping })
  const popover = usePopover(alphaOn ? 420 : 380)
  // Picker and details side by side where there's room; on phones, tabs show one at a time
  const wide = useMediaQuery('(min-width: 40rem)')
  const dialogId = useId()
  const field = useFieldControl({ id, disabled, required, invalid: invalid || unreadable || undefined, 'aria-describedby': describedBy })

  const commitTyping = () => {
    if (draft !== null && !context.setHex(draft)) setUnreadable(true)
  }

  return (
    <ColorPickerContext.Provider value={context}>
      <div ref={popover.rootRef} onKeyDown={popover.onKeyDown} className={cn('relative w-full', className)}>
        <div className={control({ size, invalid: field.invalid, disabled: field.disabled, className: 'pl-1.5' })}>
          <button
            ref={popover.triggerRef}
            type="button"
            onClick={() => {
              const opening = !popover.open
              popover.toggle()
              // Into the panel, as the date and time panels move focus in: the color square, or
              // on phones the current tab
              if (opening)
                requestAnimationFrame(() => document.getElementById(wide ? `${dialogId}-square` : `${dialogId}-panel-pick`)?.focus())
            }}
            disabled={field.disabled}
            aria-label="Choose color"
            aria-haspopup="dialog"
            aria-expanded={popover.open}
            aria-controls={popover.open ? dialogId : undefined}
            style={colorOverChecks(value)}
            className="size-8 shrink-0 cursor-pointer rounded-md border border-black/15 shadow-inner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed"
          />
          <input
            {...field.controlProps}
            type="text"
            spellCheck={false}
            autoComplete="off"
            aria-label={ariaLabel}
            value={draft ?? value.toUpperCase()}
            onChange={(e) => {
              setDraft(e.target.value)
              setUnreadable(false)
            }}
            onBlur={commitTyping}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft !== null) {
                e.preventDefault()
                commitTyping()
              } else if (e.key === 'Escape' && draft !== null) {
                // Back to the last good color (and the panel, if open, stays)
                e.preventDefault()
                e.stopPropagation()
                forgetTyping()
              }
            }}
            className={cn(controlInput, 'font-mono')}
          />
        </div>

        {popover.open ? (
          <div
            ref={popover.panelRef}
            id={dialogId}
            role="dialog"
            aria-modal="false"
            aria-label="Choose color"
            className={cn(panel, 'left-0 flex flex-col p-3', wide ? 'w-126 gap-3' : 'w-64 gap-3', popoverPlacement(popover.above))}
          >
            <PanelBody wide={wide} alphaOn={alphaOn} swatches={swatches} panelId={dialogId} />
          </div>
        ) : null}

        {name ? <input type="hidden" name={name} value={value} /> : null}
      </div>
    </ColorPickerContext.Provider>
  )
}
