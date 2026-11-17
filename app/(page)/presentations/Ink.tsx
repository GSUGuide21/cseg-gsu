'use client'

import { useRef, type FC, type PointerEvent } from 'react'

import { cn } from '@/lib/cn'

/** A spot on a slide, in the stage's own units (1100 across, 620 down), whatever size it's shown at */
export type Point = [number, number]
/** A line drawn with the pen: the spots it went through */
export type Stroke = Point[]
/** What the presenter's pointer does over a slide: points at things, draws on it, or nothing */
export type InkTool = 'laser' | 'pen' | null

const WIDTH = 1100
const HEIGHT = 620

/** Where a pointer is on the slide, in the stage's units */
const at = (e: PointerEvent<SVGSVGElement>): Point => {
  const box = e.currentTarget.getBoundingClientRect()
  const x = box.width ? ((e.clientX - box.left) / box.width) * WIDTH : 0
  const y = box.height ? ((e.clientY - box.top) / box.height) * HEIGHT : 0
  return [Math.round(Math.min(Math.max(x, 0), WIDTH) * 10) / 10, Math.round(Math.min(Math.max(y, 0), HEIGHT) * 10) / 10]
}

const path = (stroke: Stroke) => stroke.map(([x, y]) => `${x},${y}`).join(' ')

/**
 * Over a slide, what the presenter points at and draws: a red dot that follows the laser
 * pointer, and the pen's lines. It's drawn in the slide's own units, so it lands on the same
 * spot on every screen showing the slide. With no tool it takes no clicks.
 */
export const InkLayer: FC<{
  tool: InkTool
  strokes: readonly Stroke[]
  laser: Point | null
  onLaser: (at: Point | null) => void
  onDraw: (strokes: Stroke[]) => void
}> = ({ tool, strokes, laser, onLaser, onDraw }) => {
  const drawing = useRef<Stroke | null>(null)
  if (!tool && !strokes.length && !laser) return null
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={cn('absolute inset-0 z-[1] size-full touch-none', tool ? 'pointer-events-auto' : 'pointer-events-none', tool === 'pen' && 'cursor-crosshair', tool === 'laser' && 'cursor-none')}
      onPointerDown={(e) => {
        if (tool !== 'pen') return
        e.currentTarget.setPointerCapture?.(e.pointerId)
        drawing.current = [at(e)]
        onDraw([...strokes, drawing.current])
      }}
      onPointerMove={(e) => {
        if (tool === 'laser') onLaser(at(e))
        else if (tool === 'pen' && drawing.current) {
          drawing.current = [...drawing.current, at(e)]
          onDraw([...strokes.slice(0, -1), drawing.current])
        }
      }}
      onPointerUp={() => {
        drawing.current = null
      }}
      onPointerLeave={() => {
        if (tool === 'laser') onLaser(null)
      }}
    >
      {strokes.map((s, i) =>
        s.length === 1 ? (
          <circle key={i} cx={s[0][0]} cy={s[0][1]} r={2.5} fill="#e11d48" />
        ) : (
          <polyline key={i} points={path(s)} fill="none" stroke="#e11d48" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        )
      )}
      {laser ? (
        <>
          <circle cx={laser[0]} cy={laser[1]} r={16} fill="#ff1f3d" opacity={0.25} />
          <circle cx={laser[0]} cy={laser[1]} r={7} fill="#ff1f3d" />
        </>
      ) : null}
    </svg>
  )
}
