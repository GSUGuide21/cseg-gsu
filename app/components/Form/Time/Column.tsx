'use client'

import { useEffect, useRef, type FC, type KeyboardEvent } from 'react'

import { cn } from '@/lib/cn'

export interface TimeColumnProps {
  label: string
  options: readonly { value: number; label: string; disabled: boolean }[]
  selected: number | null
  onSelect: (value: number) => void
  /** Arrow left/right: move to the column beside this one */
  onLeave: (direction: -1 | 1) => void
  /** Enter: done picking */
  onDone: () => void
  /** Lets the picker move focus between columns */
  register: (focus: () => void) => void
}

/**
 * One column of a time picker (hours, minutes, or AM/PM). Up/Down pick the next choice
 * at once, as a phone's time wheel does; Home/End jump to the ends; Left/Right move
 * between columns; Enter is done. The picked choice stays centered in view.
 */
export const TimeColumn: FC<TimeColumnProps> = ({ label, options, selected, onSelect, onLeave, onDone, register }) => {
  const listRef = useRef<HTMLDivElement>(null)
  const current = options.findIndex((o) => o.value === selected)
  // With nothing picked yet, the first open choice takes the tab stop
  const tabStop = current >= 0 ? current : Math.max(0, options.findIndex((o) => !o.disabled))

  const optionEl = (i: number) => listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[i]

  // Center the picked choice in the column (without scrolling the page)
  useEffect(() => {
    const list = listRef.current
    const el = optionEl(tabStop)
    if (list && el) list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2
  }, [tabStop])

  useEffect(() => register(() => optionEl(tabStop)?.focus()))

  const pickAt = (i: number) => {
    const o = options[i]
    if (!o || o.disabled) return
    onSelect(o.value)
    optionEl(i)?.focus()
  }

  const step = (from: number, by: 1 | -1) => {
    for (let i = from + by; i >= 0 && i < options.length; i += by) if (!options[i].disabled) return pickAt(i)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => step(tabStop, 1),
      ArrowUp: () => step(tabStop, -1),
      Home: () => step(-1, 1),
      End: () => step(options.length, -1),
      ArrowLeft: () => onLeave(-1),
      ArrowRight: () => onLeave(1),
      Enter: onDone,
    }
    if (!keys[e.key]) return
    e.preventDefault()
    keys[e.key]()
  }

  return (
    <div className="flex w-16 flex-col gap-1">
      <span aria-hidden className="text-center text-[0.7rem] font-semibold tracking-wider text-muted uppercase">
        {label}
      </span>
      <div
        ref={listRef}
        role="listbox"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="relative flex h-52 flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-lg [scrollbar-width:thin]"
      >
        {options.map((o, i) => {
          const on = o.value === selected
          return (
            <div
              key={o.value}
              role="option"
              aria-selected={on}
              aria-disabled={o.disabled || undefined}
              tabIndex={i === tabStop ? 0 : -1}
              onClick={() => pickAt(i)}
              className={cn(
                'grid h-9 shrink-0 cursor-pointer place-items-center rounded-lg text-[0.9rem] text-ink tabular-nums transition-colors outline-none',
                'hover:bg-brand-tint focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset',
                on && 'bg-brand-solid font-semibold text-white hover:bg-brand-solid-hover',
                o.disabled && 'cursor-not-allowed text-ink-faint/50 hover:bg-transparent'
              )}
            >
              {o.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
