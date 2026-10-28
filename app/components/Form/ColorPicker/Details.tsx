'use client'

import { Check, ClipboardPaste, Copy } from 'lucide-react'
import { useEffect, useId, useState, type FC, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { controlButton, footerButton } from '../Input/variants'
import { blend, channels, colorFormats, contrastRatio, contrastText, hslToHex, luminance, rgbHex, wcagRating, withAlpha } from './color'
import { useColorPicker } from './Context'

/** How long the check shows after copying, before the copy icon comes back */
const COPIED_MS = 1500

const ratingClass: Record<string, string> = {
  AAA: 'bg-[#15803d] text-white',
  AA: 'bg-[#15803d] text-white',
  'AA large': 'bg-[#ca8a04] text-black',
  Fails: 'bg-danger text-surface',
}

/** Small uppercase heading for a group of details */
const Heading: FC<{ id?: string; children: ReactNode }> = ({ id, children }) => (
  <span id={id} className="text-[0.7rem] font-bold tracking-wider text-muted uppercase">
    {children}
  </span>
)

/**
 * One number, such as Red or Hue, edited in place. Valid numbers apply as they're typed
 * (or stepped with the arrow keys); leaving the box puts back the real value if what's
 * there isn't one. Kept as typed while focused, since a hue on a gray, for one, can't
 * show in the color.
 */
const ChannelField: FC<{ label: string; value: number; max: number; unit?: string; onValue: (n: number) => void }> = ({
  label,
  value,
  max,
  unit,
  onValue,
}) => {
  const [draft, setDraft] = useState<string | null>(null)
  const id = useId()
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col items-center gap-0.5">
      <span className="flex w-full items-center rounded-md border border-line bg-surface pr-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={draft ?? String(value)}
          onChange={(e) => {
            setDraft(e.target.value)
            const n = Number(e.target.value)
            if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= max) onValue(Math.round(n))
          }}
          onBlur={() => setDraft(null)}
          className="w-full min-w-0 border-0 bg-transparent py-1 pl-1.5 text-center font-mono text-[0.8rem] text-ink tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {unit ? (
          <span aria-hidden className="text-[0.7rem] text-ink-faint">
            {unit}
          </span>
        ) : null}
      </span>
      <span className="text-[0.68rem] text-muted">{label}</span>
    </label>
  )
}

/** A format's heading and copy button over its channel fields */
const ChannelGroup: FC<{ name: string; text: string; copied: boolean; onCopy: () => void; children: ReactNode }> = ({
  name,
  text,
  copied,
  onCopy,
  children,
}) => {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Heading id={id}>{name}</Heading>
        <CopyButton label={name} text={text} copied={copied} onCopy={onCopy} />
      </div>
      <div className="grid grid-cols-3 gap-1.5">{children}</div>
    </div>
  )
}

const CopyButton: FC<{ label: string; text: string; copied: boolean; onCopy: () => void }> = ({ label, text, copied, onCopy }) => (
  <button type="button" onClick={onCopy} aria-label={`Copy ${label} ${text}`} title={text} className={cn(controlButton, 'size-7')}>
    {copied ? <Check size={15} className="text-[#15803d] dark:text-[#4ade80]" aria-hidden /> : <Copy size={15} aria-hidden />}
  </button>
)

/**
 * How this color does as text on a light and a dark page; a see-through color is judged as
 * it shows on each. "row" lays the sample, ratio, and rating out in a line.
 */
const Contrast: FC<{ color: string; on: string; name: string; row?: boolean }> = ({ color, on, name, row = false }) => {
  const ratio = contrastRatio(color, on)
  const rating = wcagRating(ratio)
  const sample = (
    <div
      className={cn('grid shrink-0 place-items-center rounded-md border border-black/10 text-[1.05rem] font-bold', row ? 'h-9 w-12' : 'h-10')}
      style={{ backgroundColor: on, color }}
      aria-hidden
    >
      Aa
    </div>
  )
  const label = (
    <span className="text-[0.75rem] text-muted">
      <span className="sr-only">As text on </span>
      {name}
    </span>
  )
  const figure = <span className="text-[0.8rem] font-bold text-ink tabular-nums">{ratio.toFixed(2).replace(/\.?0+$/, '')}:1</span>
  const badge = <span className={cn('rounded px-1.5 py-px text-[0.68rem] font-bold tracking-wide', ratingClass[rating])}>{rating}</span>
  return row ? (
    <div className="flex items-center gap-2.5 rounded-lg border border-line p-1.5 pr-2.5">
      {sample}
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        {label}
        {figure}
      </span>
      {badge}
    </div>
  ) : (
    <div className="flex flex-col gap-1.5 rounded-lg border border-line p-2">
      {sample}
      <div className="flex items-center justify-between gap-1">
        {label}
        {figure}
      </div>
      <span className="self-start">{badge}</span>
    </div>
  )
}

/**
 * The color's details: its hex code, red/green/blue and hue/saturation/lightness as
 * editable numbers (plus alpha when it's on), each format copyable; a paste button; and how
 * readable the color is as text on white and on black (WCAG contrast).
 *
 * "stacked" (default) runs top to bottom, for a narrow panel; "wide" lays it out in rows
 * across a wide one: RGB beside HSL, then hex, alpha, and paste, then both contrasts.
 */
export const ColorDetails: FC<{ layout?: 'stacked' | 'wide' }> = ({ layout = 'stacked' }) => {
  const { hex, alpha, setHex, setSolid, setAlpha } = useColorPicker()
  const [copied, setCopied] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const formats = colorFormats(hex, alpha ?? undefined)
  const c = channels(hex)

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(null), COPIED_MS)
    return () => window.clearTimeout(t)
  }, [copied])

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setMessage(`Copied ${text}`)
    } catch {
      setMessage('Couldn’t copy. Select the value and copy it instead.')
    }
  }

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (setHex(text)) setMessage(`Pasted ${text}`)
      else setMessage('There’s no color on the clipboard. Copy a hex, rgb(), hsl(), or color name first.')
    } catch {
      setMessage('Couldn’t read the clipboard. Paste into the color box instead.')
    }
  }

  // A see-through color is judged by how it shows: blended over each background
  const shown = (on: string) => (alpha === null ? hex : blend(hex, alpha, on))
  const onWhite = shown('#ffffff')
  const best = contrastText(onWhite)

  const wide = layout === 'wide'

  const hexRow = (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-fill py-0.5 pr-0.5 pl-2.5">
      <Heading>HEX</Heading>
      <span className="min-w-0 flex-1 truncate font-mono text-[0.8rem] text-ink select-all">{formats.HEX}</span>
      <CopyButton label="HEX" text={formats.HEX} copied={copied === 'HEX'} onCopy={() => copy('HEX', formats.HEX)} />
    </div>
  )

  const rgb = (
    <ChannelGroup name="RGB" text={formats.RGB} copied={copied === 'RGB'} onCopy={() => copy('RGB', formats.RGB)}>
      <ChannelField label="Red" value={c.r} max={255} onValue={(r) => setSolid(rgbHex(r, c.g, c.b))} />
      <ChannelField label="Green" value={c.g} max={255} onValue={(g) => setSolid(rgbHex(c.r, g, c.b))} />
      <ChannelField label="Blue" value={c.b} max={255} onValue={(b) => setSolid(rgbHex(c.r, c.g, b))} />
    </ChannelGroup>
  )

  const hsl = (
    <ChannelGroup name="HSL" text={formats.HSL} copied={copied === 'HSL'} onCopy={() => copy('HSL', formats.HSL)}>
      <ChannelField label="Hue" value={c.h} max={360} unit="°" onValue={(h) => setSolid(hslToHex(h, c.s, c.l))} />
      <ChannelField label="Saturation" value={c.s} max={100} unit="%" onValue={(s) => setSolid(hslToHex(c.h, s, c.l))} />
      <ChannelField label="Lightness" value={c.l} max={100} unit="%" onValue={(l) => setSolid(hslToHex(c.h, c.s, l))} />
    </ChannelGroup>
  )

  const alphaField =
    alpha !== null ? (
      // Lined up with the field, not the field plus its caption
      <div role="group" aria-label="Alpha" className="flex items-start gap-2">
        <span className="pt-1.5">
          <Heading>Alpha</Heading>
        </span>
        <div className={wide ? 'w-18' : 'w-[calc((100%-0.75rem)/3)] min-w-16'}>
          <ChannelField label="Opacity" value={Math.round(alpha * 100)} max={100} unit="%" onValue={(a) => setAlpha(a / 100)} />
        </div>
        <span className="sr-only">{withAlpha(hex, alpha)}</span>
      </div>
    ) : null

  const pasteButton = (
    <button
      type="button"
      onClick={paste}
      className={cn(footerButton, 'inline-flex shrink-0 items-center justify-center gap-1.5 border border-line text-ink-soft hover:border-brand/45 hover:text-brand')}
    >
      <ClipboardPaste size={15} aria-hidden />
      Paste a color
    </button>
  )

  const contrast = (
    <div className="flex flex-col gap-1.5">
      <Heading>Contrast as text</Heading>
      <div className="grid grid-cols-2 gap-1.5">
        <Contrast color={shown('#ffffff')} on="#ffffff" name="White" row={wide} />
        <Contrast color={shown('#000000')} on="#000000" name="Black" row={wide} />
      </div>
      <p className="m-0 text-[0.75rem] leading-snug text-muted">
        Luminance {luminance(onWhite).toFixed(3)}. Text on this color{alpha !== null && alpha < 1 ? ' (over white)' : ''} reads best in{' '}
        {best === '#ffffff' ? 'white' : 'black'} ({contrastRatio(onWhite, best).toFixed(1)}:1).
      </p>
    </div>
  )

  const messages = (
    <>
      <p className="sr-only" aria-live="polite">
        {message}
      </p>
      {message && !message.startsWith('Copied') && !message.startsWith('Pasted') ? (
        <p className="m-0 text-[0.75rem] font-semibold text-danger">{message}</p>
      ) : null}
    </>
  )

  return wide ? (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-4">
        {rgb}
        {hsl}
      </div>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">{hexRow}</div>
        {alphaField}
        {pasteButton}
      </div>
      {contrast}
      {messages}
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      {hexRow}
      {rgb}
      {hsl}
      {alphaField}
      {pasteButton}
      {contrast}
      {messages}
    </div>
  )
}
