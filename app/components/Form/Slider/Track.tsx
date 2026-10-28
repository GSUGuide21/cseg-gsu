'use client'

import { useId, useRef, useState, type CSSProperties, type FC, type KeyboardEvent, type PointerEvent } from 'react'

import { cn } from '@/lib/cn'

import type { SliderMark, SliderTrackProps } from './types'

const decimals = (n: number) => (String(n).split('.')[1] ?? '').length

/** Half a thumb (20px): how far in from each end of a plain track the thumbs and marks travel */
const INSET = 10

const markParts = (m: SliderMark) => (typeof m === 'number' ? { value: m, label: undefined } : m)

/**
 * A slider built from divs, so it can carry any number of thumbs, marks, and tooltips
 * and look the same in every browser. Each thumb is a focusable role="slider" with the
 * keys people expect: arrows step, Page Up/Down jump a tenth of the range, Home/End go to
 * the ends. Pointer drags work anywhere on the track and move the nearest thumb.
 *
 * On a plain track, thumbs and marks travel between points half a thumb in from each end,
 * so a thumb at either end sits fully on the track instead of hanging off it. A painted
 * track (`trackStyle`, like the color picker's hue bar) keeps them edge to edge, so the
 * color under the thumb is the color it means.
 */
export const SliderTrack: FC<SliderTrackProps> = ({
  values,
  onValuesChange,
  min = 0,
  max = 100,
  step = 1,
  type = 'horizontal',
  minDistance = 0,
  formatValue,
  thumbLabels = [],
  labelledBy,
  describedBy,
  id,
  disabled = false,
  invalid = false,
  marks,
  snapToMarks = false,
  tooltip = false,
  fill = true,
  trackStyle,
  className,
}) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([])
  const [dragging, setDragging] = useState<number | null>(null)
  const labelIds = useId()
  const vertical = type === 'vertical'
  const span = max - min || 1
  const places = Math.max(decimals(step), decimals(min))
  const pct = (v: number) => ((v - min) / span) * 100
  const inset = trackStyle ? 0 : INSET

  const parts = (marks ?? []).map(markParts).filter((m) => m.value >= min && m.value <= max)
  // With snapToMarks, the marks are the only places a thumb can stop
  const stops = snapToMarks && parts.length ? [...new Set(parts.map((m) => m.value))].sort((a, b) => a - b) : null
  const markLabel = (v: number) => parts.find((m) => m.value === v)?.label
  // Read aloud: your format, or else the mark's label when the thumb is on one ("OK")
  const spoken = (v: number) => (formatValue ? formatValue(v) : markLabel(v))
  const format = formatValue ?? String

  /** Where a thumb may go: inside the track and clear of its neighbors */
  const bounds = (i: number) => [
    i > 0 ? values[i - 1] + minDistance : min,
    i < values.length - 1 ? values[i + 1] - minDistance : max,
  ]

  /** The nearest stop to `v` that's within [lo, hi] (or `v` itself without stops) */
  const nearestStop = (v: number, lo: number, hi: number) => {
    if (!stops) return v
    const allowed = stops.filter((s) => s >= lo && s <= hi)
    if (!allowed.length) return values[0]
    return allowed.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best))
  }

  const setThumb = (i: number, raw: number) => {
    const [lo, hi] = bounds(i)
    const v = Number(nearestStop(Math.min(hi, Math.max(lo, raw)), lo, hi).toFixed(places))
    if (v === values[i]) return
    const next = [...values]
    next[i] = v
    onValuesChange(next)
  }

  /** The value under the pointer, snapped to the step (or the nearest mark) */
  const valueAt = (e: PointerEvent) => {
    const box = rootRef.current!.getBoundingClientRect()
    const length = (vertical ? box.height : box.width) - inset * 2
    const offset = vertical ? box.bottom - inset - e.clientY : e.clientX - box.left - inset
    const raw = min + Math.min(1, Math.max(0, offset / Math.max(1, length))) * span
    return stops ? raw : min + Math.round((raw - min) / step) * step
  }

  /** Which thumb a press at `v` should move: the nearest; when two sit together, the one that can move toward it */
  const thumbFor = (v: number) => {
    let i = 0
    values.forEach((x, j) => {
      const d = Math.abs(x - v)
      const best = Math.abs(values[i] - v)
      if (d < best || (d === best && v > x)) i = j
    })
    return i
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return
    e.preventDefault()
    const v = valueAt(e)
    const i = thumbFor(v)
    rootRef.current!.setPointerCapture(e.pointerId)
    setDragging(i)
    thumbRefs.current[i]?.focus()
    setThumb(i, v)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging !== null) setThumb(dragging, valueAt(e))
  }

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging === null) return
    rootRef.current?.releasePointerCapture(e.pointerId)
    setDragging(null)
  }

  const onKeyDown = (i: number) => (e: KeyboardEvent) => {
    const [lo, hi] = bounds(i)
    const v = values[i]
    let moves: Record<string, number>
    if (stops) {
      // Mark to mark
      const allowed = stops.filter((s) => s >= lo && s <= hi)
      const up = allowed.find((s) => s > v) ?? v
      const down = [...allowed].reverse().find((s) => s < v) ?? v
      moves = { ArrowRight: up, ArrowUp: up, PageUp: up, ArrowLeft: down, ArrowDown: down, PageDown: down, Home: allowed[0] ?? v, End: allowed[allowed.length - 1] ?? v }
    } else {
      const big = Math.max(step, Math.round(span / 10 / step) * step)
      moves = { ArrowRight: v + step, ArrowUp: v + step, ArrowLeft: v - step, ArrowDown: v - step, PageUp: v + big, PageDown: v - big, Home: lo, End: hi }
    }
    if (!(e.key in moves) || disabled) return
    e.preventDefault()
    setThumb(i, moves[e.key])
  }

  /** A point along the travel, as CSS: `p`% of the way between the two inset ends */
  const at = (p: number) => (inset ? `calc(${inset}px + (100% - ${inset * 2}px) * ${p / 100})` : `${p}%`)
  const along = (p: number): CSSProperties => (vertical ? { bottom: at(p) } : { left: at(p) })
  const lowFill = values.length > 1 ? pct(values[0]) : 0
  const highFill = pct(values[values.length - 1])
  // One thumb: fill from the very start of the track; two: between the thumbs' centers
  const fillFrom = values.length > 1 ? at(lowFill) : '0px'
  const fillTo = at(highFill)
  const labeledMarks = parts.some((m) => m.label)

  return (
    <div
      ref={rootRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={cn(
        'relative touch-none select-none',
        // Horizontal tracks give up room to the value readout beside them
        vertical ? 'h-44 w-5 shrink-0' : 'h-5 w-full min-w-0 flex-1',
        labeledMarks && (vertical ? 'mr-16' : 'mb-6'),
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
    >
      {/* Track, with the filled part */}
      <div
        style={trackStyle}
        className={cn(
          'absolute overflow-hidden rounded-full',
          trackStyle ? '' : 'bg-line',
          vertical ? 'inset-y-0 left-1/2 w-2 -translate-x-1/2' : 'inset-x-0 top-1/2 h-2 -translate-y-1/2',
          invalid && 'outline-2 outline-offset-2 outline-danger'
        )}
      >
        {fill ? (
          <div
            className="absolute rounded-full bg-brand"
            style={
              vertical
                ? { bottom: fillFrom, height: `calc(${fillTo} - ${fillFrom})`, left: 0, right: 0 }
                : { left: fillFrom, width: `calc(${fillTo} - ${fillFrom})`, top: 0, bottom: 0 }
            }
          />
        ) : null}
      </div>

      {/* Marks: a dot on the track and, when labeled, text beside it that moves the thumb there */}
      {parts.map(({ value, label }) => {
        const filled = fill && pct(value) >= lowFill && pct(value) <= highFill
        const current = values.includes(value)
        return (
          <span key={value} className="pointer-events-none absolute" style={{ ...along(pct(value)), ...(vertical ? { left: '50%' } : { top: '50%' }) }}>
            <span aria-hidden className={cn('absolute size-1.5 -translate-1/2 rounded-full transition-colors', filled ? 'bg-white' : 'bg-ink-faint/70')} />
            {label ? (
              <span
                aria-hidden
                onPointerDown={(e) => {
                  // Primary button only (other buttons have a number above 0)
                  if (disabled || e.button > 0) return
                  // Straight to this mark, without starting a drag from the track
                  e.preventDefault()
                  e.stopPropagation()
                  const i = thumbFor(value)
                  thumbRefs.current[i]?.focus()
                  setThumb(i, value)
                }}
                // Shifted back by its own share of the track, so end labels stay inside it
                style={vertical ? undefined : { transform: `translateX(-${pct(value)}%)` }}
                className={cn(
                  'absolute text-[0.75rem] whitespace-nowrap transition-colors',
                  vertical ? 'top-0 left-4 -translate-y-1/2' : 'top-3 left-0',
                  current ? 'font-semibold text-ink' : 'text-muted',
                  !disabled && 'pointer-events-auto cursor-pointer hover:text-ink'
                )}
              >
                {label}
              </span>
            ) : null}
          </span>
        )
      })}

      {values.map((v, i) => {
        const thumbLabelId = `${labelIds}-thumb-${i}`
        const thumbLabel = thumbLabels[i]
        const [lo, hi] = bounds(i)
        return (
          <div
            key={i}
            ref={(el) => {
              thumbRefs.current[i] = el
            }}
            role="slider"
            id={i === 0 ? id : undefined}
            tabIndex={disabled ? -1 : 0}
            aria-valuemin={lo}
            aria-valuemax={hi}
            aria-valuenow={v}
            aria-valuetext={spoken(v)}
            aria-orientation={vertical ? 'vertical' : 'horizontal'}
            aria-disabled={disabled || undefined}
            // The slider's label, then this thumb's ("Price, Minimum")
            aria-labelledby={labelledBy ? [labelledBy, thumbLabel ? thumbLabelId : undefined].filter(Boolean).join(' ') : undefined}
            aria-label={labelledBy ? undefined : thumbLabel}
            aria-describedby={describedBy}
            onKeyDown={onKeyDown(i)}
            data-dragging={dragging === i || undefined}
            style={along(pct(v))}
            className={cn(
              'group/thumb absolute size-5 rounded-full border-[3px] border-brand bg-white shadow-[0_1px_4px_rgb(0_0_0/0.3)] transition-[scale] outline-none',
              vertical ? 'left-1/2 -translate-x-1/2 translate-y-1/2' : 'top-1/2 -translate-x-1/2 -translate-y-1/2',
              'focus-visible:ring-4 focus-visible:ring-brand/30 data-dragging:scale-115 motion-reduce:transition-none',
              disabled ? 'cursor-not-allowed' : 'cursor-grab data-dragging:cursor-grabbing',
              // Whichever thumb was used last sits on top, so stacked thumbs stay reachable
              dragging === i && 'z-10'
            )}
          >
            {thumbLabel && labelledBy ? (
              <span id={thumbLabelId} hidden>
                {thumbLabel}
              </span>
            ) : null}
            {tooltip ? (
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute rounded-md bg-ink px-1.5 py-0.5 text-[0.75rem] font-semibold whitespace-nowrap text-surface tabular-nums opacity-0 transition-opacity',
                  'group-hover/thumb:opacity-100 group-focus-visible/thumb:opacity-100 group-data-dragging/thumb:opacity-100',
                  vertical ? 'top-1/2 left-full ml-2.5 -translate-y-1/2' : 'bottom-full left-1/2 mb-2 -translate-x-1/2'
                )}
              >
                {format(v)}
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
