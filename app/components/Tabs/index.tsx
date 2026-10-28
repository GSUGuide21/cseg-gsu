'use client'

import { useEffect, useId, useRef, type FC, type KeyboardEvent } from 'react'

import { cn } from '@/lib/cn'

import { useControllable } from '../Form/useControllable'
import type { TabsProps } from './types'

/**
 * Views of one thing, one at a time: Overview / Members / Settings.
 *
 *   <Tabs aria-label="Event" items={[
 *     { id: 'overview', label: 'Overview', content: <Overview /> },
 *     { id: 'rsvps', label: 'RSVPs', count: 42, content: <Rsvps /> },
 *   ]} />
 *
 * The WAI-ARIA tabs pattern: Tab goes to the open tab and then into its panel; the arrow
 * keys, Home, and End move between tabs. A long row scrolls sideways rather than wrapping.
 * Closed panels stay mounted (hidden), so what's typed in one isn't lost on switching.
 */
export const Tabs: FC<TabsProps> = ({
  items,
  'aria-label': ariaLabel,
  value,
  defaultValue,
  onValueChange,
  appearance = 'line',
  activation = 'auto',
  fitted = false,
  className,
  panelClassName,
}) => {
  const firstEnabled = items.find((t) => !t.disabled)?.id ?? ''
  const [selected, setSelected] = useControllable(value, defaultValue ?? firstEnabled, onValueChange)
  // A selection that no longer exists (items changed) falls back to the first tab
  const active = items.some((t) => t.id === selected && !t.disabled) ? selected : firstEnabled
  const id = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const line = appearance === 'line'

  // Keep the open tab in view in a row that scrolls
  useEffect(() => {
    const tab = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    tab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  }, [active])

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabled = items.map((t, i) => (t.disabled ? -1 : i)).filter((i) => i >= 0)
    const at = enabled.indexOf(index)
    let next: number | undefined
    if (e.key === 'ArrowRight') next = enabled[(at + 1) % enabled.length]
    else if (e.key === 'ArrowLeft') next = enabled[(at - 1 + enabled.length) % enabled.length]
    else if (e.key === 'Home') next = enabled[0]
    else if (e.key === 'End') next = enabled[enabled.length - 1]
    if (next === undefined) return
    e.preventDefault()
    listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus()
    if (activation === 'auto') setSelected(items[next].id)
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-4', className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          'flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          line ? 'gap-1 border-b border-line' : 'gap-1 rounded-xl bg-fill p-1'
        )}
      >
        {items.map((tab, i) => {
          const on = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${id}-tab-${tab.id}`}
              aria-selected={on}
              aria-controls={`${id}-panel-${tab.id}`}
              // Roving focus: only the open tab is in the Tab order
              tabIndex={on ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => setSelected(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 text-[0.9rem] font-semibold whitespace-nowrap transition-colors',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45',
                '[&>svg]:size-4 [&>svg]:shrink-0',
                fitted && 'flex-1',
                line
                  ? cn(
                      // The underline sits on the list's border
                      '-mb-px rounded-t-md border-b-2 px-3 py-2.5',
                      on ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:border-line hover:text-ink'
                    )
                  : cn('rounded-lg px-3 py-1.5', on ? 'bg-surface text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-ink-soft hover:text-ink')
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined ? (
                <span
                  className={cn(
                    'min-w-5 rounded-full px-1.5 py-0.5 text-center text-[0.7rem] leading-none tabular-nums',
                    on ? 'bg-brand-tint text-brand' : line ? 'bg-fill text-ink-soft' : 'bg-surface text-ink-soft'
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      {items.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${id}-panel-${tab.id}`}
          aria-labelledby={`${id}-tab-${tab.id}`}
          hidden={tab.id !== active}
          // Focusable, so Tab reaches a panel with nothing focusable in it
          tabIndex={0}
          className={cn('rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand', panelClassName)}
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}
