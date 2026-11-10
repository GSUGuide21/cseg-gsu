import { type FC, type PointerEvent, type RefObject, useRef } from 'react'

/** Where the panel rests over the map below the `lg` breakpoint; `lg` and up it's docked beside it */
export type SheetStop = 'peek' | 'half' | 'full'

/** How tall a peeking sheet is: the handle, title, mode switch, and search. Matches `10.625rem` below. */
const PEEK_PX = 170
/** The map stays visible above a full sheet. Matches `3.5rem` below. */
const FULL_GAP_PX = 56

export const sheetClass: Record<SheetStop, string> = {
  peek: 'max-lg:h-[10.625rem]',
  half: 'max-lg:h-1/2',
  full: 'max-lg:h-[calc(100%-3.5rem)]',
}

const stops = (height: number): Record<SheetStop, number> => ({ peek: PEEK_PX, half: height / 2, full: height - FULL_GAP_PX })

/** Map pixels hidden at the bottom by the sheet; a full sheet is treated as half, since picks drop it there */
export const sheetCover = (stop: SheetStop, height: number) => (stop === 'peek' ? PEEK_PX : height / 2)

const NEXT: Record<SheetStop, SheetStop> = { peek: 'half', half: 'full', full: 'peek' }

export type SheetHandleProps = {
  stop: SheetStop
  onStop: (stop: SheetStop) => void
  /** The sheet's height while it's being dragged, undefined once it's let go */
  onDrag: (height?: number) => void
  sheetRef: RefObject<HTMLElement | null>
}

/** Drag to resize, or click (or press Enter) to step through the stops. Phones and tablets only. */
export const SheetHandle: FC<SheetHandleProps> = ({ stop, onStop, onDrag, sheetRef }) => {
  const drag = useRef<{ y: number; height: number; moved: boolean }>(null)

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!sheetRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, height: sheetRef.current.offsetHeight, moved: false }
  }

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const parent = sheetRef.current?.parentElement
    if (!drag.current || !parent) return
    const delta = drag.current.y - e.clientY
    if (Math.abs(delta) > 4) drag.current.moved = true
    if (!drag.current.moved) return
    const { peek, full } = stops(parent.clientHeight)
    onDrag(Math.min(Math.max(drag.current.height + delta, peek), full))
  }

  const onPointerUp = () => {
    const parent = sheetRef.current?.parentElement
    if (!drag.current?.moved || !parent || !sheetRef.current) return
    const height = sheetRef.current.offsetHeight
    const [nearest] = Object.entries(stops(parent.clientHeight)).sort(([, a], [, b]) => Math.abs(a - height) - Math.abs(b - height))
    onStop(nearest[0] as SheetStop)
    onDrag(undefined)
  }

  return (
    <button
      type="button"
      aria-label={stop === 'full' ? 'Collapse panel' : 'Expand panel'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={() => {
        // A drag ends in a click too; only a plain press steps to the next stop
        if (!drag.current?.moved) onStop(NEXT[stop])
        drag.current = null
      }}
      className="flex h-6 w-full shrink-0 cursor-grab touch-none items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand active:cursor-grabbing lg:hidden"
    >
      <span className="h-1 w-10 rounded-full bg-line" aria-hidden />
    </button>
  )
}
