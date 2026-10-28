'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties, type FC, type KeyboardEvent } from 'react'

import { cn } from '@/lib/cn'

import { useFloating } from '../../useFloating'

export interface ComboOption {
  label: string
  /** What's applied; "" for "back to the default" */
  value: string
  /** How the option itself looks (a font option in its font) */
  style?: CSSProperties
}

/**
 * A toolbar box for a value that's typed or picked: a font, a size. Type anything and press
 * Enter (or pick from the list); Escape puts back what was there. Clicking out leaves it as
 * it was, so a half-typed size never lands on the text.
 *
 * The WAI-ARIA combobox pattern: the input is the combobox, ↓ opens the list and moves
 * through it (focus stays in the box), Enter applies the highlighted option or what's typed.
 */
export const ToolCombobox: FC<{
  label: string
  /** What the box shows when nobody's typing: the selection's font or size now */
  display: string
  options: ComboOption[]
  /** Called with the typed text or the option's value; return false to refuse it (the box shows it's invalid) */
  onCommit: (text: string, option?: ComboOption) => boolean | void
  /** Narrow the list to what's typed (fonts); a size list stays whole */
  filter?: boolean
  inputMode?: 'text' | 'numeric'
  disabled?: boolean
  className?: string
}> = ({ label, display, options, onCommit, filter = false, inputMode = 'text', disabled, className }) => {
  const [text, setText] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [invalid, setInvalid] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const id = useId()
  const floating = useFloating(open, boxRef, listRef, { side: 'bottom', align: 'start', offset: 4 })

  const typed = text ?? display
  const shown = filter && text ? options.filter((o) => o.label.toLowerCase().includes(text.trim().toLowerCase())) : options
  const current = shown.findIndex((o) => o.label.toLowerCase() === display.toLowerCase())

  // Keep the highlighted option in view
  useEffect(() => {
    if (open && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const reset = () => {
    setText(null)
    setOpen(false)
    setActive(-1)
    setInvalid(false)
  }
  const commit = (raw: string, option?: ComboOption) => {
    const ok = onCommit(raw, option)
    if (ok === false) return setInvalid(true)
    reset()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setActive(current >= 0 ? current : 0)
        return
      }
      const n = shown.length
      if (n) setActive((a) => (e.key === 'ArrowDown' ? (a + 1) % n : (a - 1 + n) % n))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const option = open && active >= 0 ? shown[active] : undefined
      commit(option ? option.value : typed, option)
    } else if (e.key === 'Escape') {
      if (open || text !== null) {
        e.preventDefault()
        e.stopPropagation()
        reset()
      }
    }
    // ←/→ and Home/End move in the text; past either end of it, ←/→ go on along the toolbar
    const input = e.currentTarget
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0
    const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length
    if (e.key === 'Home' || e.key === 'End' || (e.key === 'ArrowLeft' && !atStart) || (e.key === 'ArrowRight' && !atEnd)) e.stopPropagation()
  }

  return (
    <div
      ref={boxRef}
      className={cn(
        'relative flex h-8 shrink-0 items-center rounded-md border border-transparent bg-transparent transition-colors hover:border-line focus-within:border-brand focus-within:bg-surface',
        invalid && 'border-danger hover:border-danger focus-within:border-danger',
        disabled && 'opacity-40',
        className
      )}
    >
      <input
        data-tool
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete={filter ? 'list' : 'none'}
        aria-activedescendant={open && active >= 0 && shown[active] ? `${id}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={typed}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          setText(e.target.value)
          setInvalid(false)
          setOpen(true)
          setActive(filter ? 0 : -1)
        }}
        onBlur={reset}
        onKeyDown={onKeyDown}
        className="h-full w-full min-w-0 bg-transparent pl-2 text-[0.82rem] font-semibold text-ink-soft outline-none focus:text-ink disabled:cursor-not-allowed"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        // Keep focus in the box; this only opens and closes the list
        onMouseDown={(e) => {
          e.preventDefault()
          boxRef.current?.querySelector('input')?.focus()
          setOpen((o) => !o)
          setActive(current)
        }}
        className="grid h-full w-6 shrink-0 cursor-pointer place-items-center text-ink-faint hover:text-ink disabled:cursor-not-allowed"
      >
        <ChevronDown size={14} />
      </button>
      {open && shown.length ? (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          // Fixed (so the editor's frame can't clip it), so percentages would mean the window:
          // as wide as its options, and never narrower than the box
          style={{ ...floating.style, minWidth: boxRef.current?.offsetWidth }}
          className="z-40 m-0 max-h-64 w-max max-w-[min(20rem,calc(100vw-1rem))] list-none overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-[0_12px_32px_rgb(0_0_0/0.14)]"
        >
          {shown.map((o, i) => (
            <li
              key={o.label}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              // Pressing an option shouldn't blur the box first (that would reset it)
              onMouseDown={(e) => e.preventDefault()}
              onPointerMove={() => i !== active && setActive(i)}
              onClick={() => commit(o.value, o)}
              style={o.style}
              className={cn(
                'cursor-pointer rounded-lg px-2.5 py-1.5 text-[0.88rem] whitespace-nowrap text-ink',
                i === active && 'bg-fill',
                o.label.toLowerCase() === display.toLowerCase() && 'font-semibold text-brand'
              )}
            >
              {o.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
