'use client'

import { useEffect, useId, useMemo, useRef, useState, type FC, type KeyboardEvent } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControl } from '../Field'
import { menuList, panel } from '../Input/variants'
import type { Option, OptionGroup } from '../types'
import { useControllable } from '../useControllable'
import { popoverPlacement } from '../usePopover'
import { SelectContext } from './Context'
import { SelectGroup } from './Menu/Group'
import { SelectOption } from './Menu/Option'
import { SelectTrigger } from './Trigger'
import type { SelectProps } from './types'

const isGroup = (item: Option | OptionGroup): item is OptionGroup => 'options' in item

/** How long typed letters keep adding to a dropdown's type-to-jump search */
const TYPEAHEAD_MS = 600

/** Below this much room under the trigger (and more above), the menu opens upward */
const MENU_ROOM = 280

/**
 * Pick from a list of options.
 *
 *   <Select options={MAJORS} placeholder="Choose a major" />                      // dropdown
 *   <Select type="combobox" options={MAJORS} />                                     // with search
 *   <Select type="tags" options={INTERESTS} name="interests" />                     // several, as tags
 *   <Select mode="multiple" options={DAYS} defaultValue={['mon']} />                // several, as a list
 *
 * Keyboard: arrows move through the options (and open the menu), Enter picks, Escape
 * closes, Home/End jump to the ends, and typing in a dropdown jumps to a matching option.
 * In tags, Backspace in an empty search removes the last tag.
 */
export const Select: FC<SelectProps> = (props) => {
  const {
    options: items,
    type = 'dropdown',
    placeholder,
    name,
    size = 'md',
    id,
    disabled,
    required,
    invalid,
    className,
    emptyText = 'No matches',
    'aria-label': ariaLabel,
    'aria-describedby': describedBy,
  } = props
  const multiple = type === 'tags' || props.mode === 'multiple'
  const searchable = type !== 'dropdown'

  // One list of picked values, whatever the mode; single mode reports the first (or null)
  const toList = (v: string | string[] | null | undefined) => (v === undefined ? undefined : v === null ? [] : Array.isArray(v) ? v : [v])
  const [selected, setSelected] = useControllable<string[]>(toList(props.value), toList(props.defaultValue) ?? [], (next) =>
    multiple
      ? (props.onValueChange as ((v: string[]) => void) | undefined)?.(next)
      : (props.onValueChange as ((v: string | null) => void) | undefined)?.(next[0] ?? null)
  )

  const field = useFieldControl({ id, disabled, required, invalid, 'aria-describedby': describedBy })
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typeahead = useRef({ text: '', at: 0 })

  const [open, setOpen] = useState(false)
  const [above, setAbove] = useState(false)
  const [activeValue, setActiveValue] = useState<string | null>(null)
  // Search text; null in a combobox means "show the picked option's label"
  const [query, setQuery] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const all = useMemo(() => items.flatMap((item) => (isGroup(item) ? item.options : [item])), [items])
  const indexOf = useMemo(() => new Map(all.map((o, i) => [o.value, i])), [all])
  const labelOf = (value: string) => all.find((o) => o.value === value)?.label ?? value
  const optionId = (value: string) => `${listboxId}-${indexOf.get(value) ?? 'x'}`

  // What the menu shows: everything, or what the search matches
  const search = (query ?? '').trim().toLowerCase()
  const shown = useMemo(() => {
    const keep = (o: Option) => !search || o.label.toLowerCase().includes(search)
    return items.flatMap((item): (Option | OptionGroup)[] => {
      if (!isGroup(item)) return keep(item) ? [item] : []
      const options = item.options.filter(keep)
      return options.length ? [{ ...item, options }] : []
    })
  }, [items, search])
  const choices = shown.flatMap((item) => (isGroup(item) ? item.options : [item])).filter((o) => !o.disabled)

  const openMenu = (active?: string) => {
    if (field.disabled) return
    const box = rootRef.current?.getBoundingClientRect()
    if (box) {
      const below = window.innerHeight - box.bottom
      setAbove(below < MENU_ROOM && box.top > below)
    }
    setActiveValue(active ?? choices.find((o) => selected.includes(o.value))?.value ?? choices[0]?.value ?? null)
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setQuery(null)
  }

  const toggle = (value: string) => {
    const on = !selected.includes(value)
    if (multiple) {
      setSelected(on ? [...selected, value] : selected.filter((v) => v !== value))
      setAnnouncement(`${labelOf(value)} ${on ? 'added' : 'removed'}`)
      if (searchable) setQuery(type === 'tags' ? '' : null)
    } else {
      setSelected([value])
      close()
    }
  }

  const move = (by: 1 | -1) => {
    if (!choices.length) return
    const at = choices.findIndex((o) => o.value === activeValue)
    const next = at === -1 ? (by === 1 ? 0 : choices.length - 1) : Math.min(choices.length - 1, Math.max(0, at + by))
    setActiveValue(choices[next].value)
  }

  const jumpTo = (letter: string) => {
    const now = Date.now()
    const text = (now - typeahead.current.at < TYPEAHEAD_MS ? typeahead.current.text : '') + letter.toLowerCase()
    typeahead.current = { text, at: now }
    const hit = choices.find((o) => o.label.toLowerCase().startsWith(text))
    if (!hit) return
    if (open) setActiveValue(hit.value)
    else openMenu(hit.value)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault()
        if (!open) openMenu()
        else move(e.key === 'ArrowDown' ? 1 : -1)
        break
      case 'Home':
      case 'End':
        // In a search box these move the caret instead
        if (open && !searchable && choices.length) {
          e.preventDefault()
          setActiveValue(choices[e.key === 'Home' ? 0 : choices.length - 1].value)
        }
        break
      case 'Enter':
        if (open && activeValue) {
          e.preventDefault()
          toggle(activeValue)
        } else if (!searchable) {
          e.preventDefault()
          openMenu()
        }
        break
      case ' ':
        if (!searchable) {
          e.preventDefault()
          if (open && activeValue) toggle(activeValue)
          else openMenu()
        }
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          close()
        }
        break
      case 'Tab':
        if (open) close()
        break
      case 'Backspace':
        if (type === 'tags' && !query && selected.length) toggle(selected[selected.length - 1])
        break
      default:
        if (!searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) jumpTo(e.key)
    }
  }

  // Close when a click lands outside
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Keep the highlighted option in view as the arrow keys move it
  useEffect(() => {
    if (open && activeValue) document.getElementById(optionId(activeValue))?.scrollIntoView?.({ block: 'nearest' })
    // optionId only changes with the options
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeValue])

  const picked = selected.map((value) => ({ value, label: labelOf(value) }))
  const inputValue = type === 'combobox' && !multiple ? (query ?? picked[0]?.label ?? '') : (query ?? '')

  return (
    <SelectContext.Provider value={{ optionId, activeValue, setActiveValue, isSelected: (v) => selected.includes(v), toggle }}>
      <div
        ref={rootRef}
        className={cn('relative w-full', className)}
        onBlur={(e) => {
          if (!rootRef.current?.contains(e.relatedTarget as Node | null)) close()
        }}
      >
        <SelectTrigger
          type={type}
          size={size}
          open={open}
          listboxId={listboxId}
          activeId={activeValue ? optionId(activeValue) : undefined}
          selected={type === 'combobox' && !multiple ? [] : picked}
          placeholder={placeholder}
          inputValue={inputValue}
          onInputChange={(text) => {
            setQuery(text)
            if (!open) openMenu()
            // The first match is highlighted, so Enter picks it
            const first = all.find((o) => !o.disabled && o.label.toLowerCase().includes(text.trim().toLowerCase()))
            setActiveValue(first?.value ?? null)
          }}
          onKeyDown={onKeyDown}
          onToggleOpen={() => (open ? close() : openMenu())}
          onOpen={() => {
            if (!open) openMenu()
          }}
          onRemove={toggle}
          field={field}
          ariaLabel={ariaLabel}
          inputRef={inputRef}
        />

        <div
          role="listbox"
          id={listboxId}
          hidden={!open}
          aria-multiselectable={multiple || undefined}
          aria-labelledby={ariaLabel ? undefined : field.labelId}
          aria-label={ariaLabel}
          className={cn(panel, menuList, popoverPlacement(above))}
        >
          {shown.length ? (
            shown.map((item) =>
              isGroup(item) ? (
                <SelectGroup key={item.label} label={item.label}>
                  {item.options.map((o) => (
                    <SelectOption key={o.value} option={o} />
                  ))}
                </SelectGroup>
              ) : (
                <SelectOption key={item.value} option={item} />
              )
            )
          ) : (
            <p className="m-0 px-2.5 py-2 text-[0.85rem] text-muted">{emptyText}</p>
          )}
        </div>

        {name ? selected.map((v) => <input key={v} type="hidden" name={name} value={v} />) : null}
        {/* Tags added or removed, which the listbox alone doesn't announce */}
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
      </div>
    </SelectContext.Provider>
  )
}
