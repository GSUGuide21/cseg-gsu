'use client'

import { ChevronDown, X } from 'lucide-react'
import type { FC, KeyboardEvent, RefObject } from 'react'

import { cn } from '@/lib/cn'

import type { useFieldControl } from '../Field'
import { control, controlInput } from '../Input/variants'
import type { ControlSize } from '../types'
import type { SelectType } from './types'

export interface SelectTriggerProps {
  type: SelectType
  size: ControlSize
  open: boolean
  listboxId: string
  activeId?: string
  selected: readonly { value: string; label: string }[]
  placeholder?: string
  /** Text in the search box (combobox and tags) */
  inputValue: string
  onInputChange: (text: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
  onToggleOpen: () => void
  onOpen: () => void
  onRemove: (value: string) => void
  field: ReturnType<typeof useFieldControl>
  ariaLabel?: string
  inputRef: RefObject<HTMLInputElement | null>
}

const Chevron: FC<{ open: boolean; onClick?: () => void }> = ({ open, onClick }) => (
  <ChevronDown
    size={17}
    aria-hidden
    onMouseDown={onClick ? (e) => e.preventDefault() : undefined}
    onClick={onClick}
    className={cn('shrink-0 text-ink-faint transition-transform motion-reduce:transition-none', open && 'rotate-180', onClick && 'cursor-pointer')}
  />
)

/**
 * What the Select shows when closed. A dropdown is a button (so its Field label focuses
 * and opens it); combobox and tags are a search input, with tags as chips before it.
 */
export const SelectTrigger: FC<SelectTriggerProps> = ({
  type,
  size,
  open,
  listboxId,
  activeId,
  selected,
  placeholder,
  inputValue,
  onInputChange,
  onKeyDown,
  onToggleOpen,
  onOpen,
  onRemove,
  field,
  ariaLabel,
  inputRef,
}) => {
  // Shared by the button and the input; each writes out role, aria-controls, and aria-expanded itself
  const combobox = {
    'aria-label': ariaLabel,
    'aria-haspopup': 'listbox' as const,
    'aria-activedescendant': open ? activeId : undefined,
    'aria-required': field.controlProps.required || undefined,
    onKeyDown,
  }
  const box = control({ size, invalid: field.invalid, disabled: field.disabled })

  if (type === 'dropdown') {
    // Everything but `required`, which buttons don't take (aria-required carries it)
    const { id, disabled, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedBy } = field.controlProps
    return (
      <button
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        {...combobox}
        onClick={onToggleOpen}
        className={cn(box, 'cursor-pointer text-left disabled:cursor-not-allowed')}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selected.length && 'text-ink-faint')}>
          {selected.length ? selected.map((s) => s.label).join(', ') : (placeholder ?? 'Select…')}
        </span>
        <Chevron open={open} />
      </button>
    )
  }

  const tags = type === 'tags'
  return (
    // Clicking anywhere in the box (around the chips) focuses the search and opens the menu
    <div
      className={cn(box, 'cursor-text', tags && selected.length > 0 && 'flex-wrap gap-1.5 py-1.5')}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault()
          inputRef.current?.focus()
          onOpen()
        }
      }}
    >
      {tags
        ? selected.map((s) => (
            <span
              key={s.value}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-tint py-0.5 pr-1 pl-2 text-[0.8rem] font-semibold text-ink"
            >
              <span className="truncate">{s.label}</span>
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Remove ${s.label}`}
                disabled={field.disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onRemove(s.value)}
                className="grid size-4 cursor-pointer place-items-center rounded-sm text-ink-soft hover:bg-brand/15 hover:text-ink"
              >
                <X size={12} aria-hidden />
              </button>
            </span>
          ))
        : null}
      <input
        {...field.controlProps}
        {...combobox}
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        ref={inputRef}
        type="text"
        autoComplete="off"
        aria-autocomplete="list"
        value={inputValue}
        placeholder={tags && selected.length ? undefined : placeholder}
        onChange={(e) => onInputChange(e.target.value)}
        onClick={onOpen}
        className={cn(controlInput, tags && 'min-w-16 py-0.5')}
      />
      <Chevron open={open} onClick={field.disabled ? undefined : onToggleOpen} />
    </div>
  )
}
