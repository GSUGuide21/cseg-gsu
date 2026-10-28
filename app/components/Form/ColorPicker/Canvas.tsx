'use client'

import { useRef, useState, type FC, type KeyboardEvent, type PointerEvent } from 'react'

import { cn } from '@/lib/cn'

import { useColorPicker } from './Context'

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Half the thumb's size: its center stays this far in from each edge, so all of it stays inside */
const INSET = 9

/** Where a 0–1 amount puts the thumb's center, inset from both ends */
const along = (amount: number) => `calc(${INSET}px + ${amount} * (100% - ${INSET * 2}px))`

/**
 * The square of saturation (left to right) and brightness (bottom to top) for the current
 * hue. Drag anywhere in it, or use the arrow keys: left/right for saturation, up/down for
 * brightness, a step of 1% (10% with Shift).
 */
export const ColorCanvas: FC<{ id?: string; className?: string }> = ({ id, className }) => {
  const { hsv, hex, setHsv } = useColorPicker()
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  // Read against the same inset track the thumb moves on, so the thumb stays under the pointer
  const pick = (e: PointerEvent) => {
    const box = ref.current!.getBoundingClientRect()
    setHsv({
      ...hsv,
      s: clamp01((e.clientX - box.left - INSET) / (box.width - INSET * 2)),
      v: clamp01(1 - (e.clientY - box.top - INSET) / (box.height - INSET * 2)),
    })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const by = e.shiftKey ? 0.1 : 0.01
    const moves: Record<string, Partial<typeof hsv>> = {
      ArrowLeft: { s: clamp01(hsv.s - by) },
      ArrowRight: { s: clamp01(hsv.s + by) },
      ArrowUp: { v: clamp01(hsv.v + by) },
      ArrowDown: { v: clamp01(hsv.v - by) },
    }
    if (!moves[e.key]) return
    e.preventDefault()
    setHsv({ ...hsv, ...moves[e.key] })
  }

  const s = Math.round(hsv.s * 100)
  const v = Math.round(hsv.v * 100)
  return (
    <div
      ref={ref}
      id={id}
      role="slider"
      tabIndex={0}
      aria-label="Saturation and brightness"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={s}
      aria-valuetext={`Saturation ${s}%, brightness ${v}%`}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        ref.current!.setPointerCapture(e.pointerId)
        ref.current!.focus()
        setDragging(true)
        pick(e)
      }}
      onPointerMove={(e) => {
        if (dragging) pick(e)
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      style={{
        backgroundColor: `hsl(${hsv.h} 100% 50%)`,
        backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
      }}
      data-dragging={dragging || undefined}
      className={cn(
        'group relative h-40 w-full cursor-crosshair touch-none rounded-lg outline-none select-none',
        'focus-visible:ring-4 focus-visible:ring-brand/30',
        className
      )}
    >
      {/* Filled with the picked color; grows while dragged or keyboard-focused */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute size-[18px] -translate-1/2 rounded-full border-[3px] border-white',
          'shadow-[0_0_0_1px_rgb(0_0_0/0.35),0_2px_6px_rgb(0_0_0/0.35)] transition-[scale] motion-reduce:transition-none',
          'group-focus-visible:scale-125 group-data-dragging:scale-125'
        )}
        style={{ left: along(hsv.s), top: along(1 - hsv.v), backgroundColor: hex }}
      />
    </div>
  )
}
