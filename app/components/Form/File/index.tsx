'use client'

import { FileText, Upload, X } from 'lucide-react'
import { useId, useRef, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { useFieldControl } from '../Field'
import type { FileInputProps } from './types'

export const units = ['B', 'KB', 'MB', 'GB', 'TB']

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  // Capped at the largest unit, so a huge number still reads ("2048 TB")
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / 1024 ** i).toFixed(1).replace(/\.0$/, '')} ${units[i]}`
}

export const toBytes = (str: string) => {
  const match = str.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  const index = units.indexOf(unit)
  return index >= 0 ? value * 1024 ** index : 0
}

/** Whether a file fits an `accept` list such as ".pdf,image/*" (the picker checks this; drops don't) */
export const accepts = (file: File, accept?: string) =>
  !accept ||
  accept.split(',').some((raw) => {
    const rule = raw.trim().toLowerCase()
    if (!rule) return false
    if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule)
    if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1))
    return file.type.toLowerCase() === rule
  })

/** Same file picked twice: keep one */
const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified

/**
 * A drop zone that also opens the file picker, listing the chosen files with a remove
 * button each. The real <input type="file"> keeps the current list, so a plain form
 * submission sends what's shown.
 */
export const FileInput: FC<FileInputProps> = ({
  onFilesChange,
  maxSize,
  maxFiles,
  hint,
  accept,
  multiple = false,
  invalid,
  className,
  id,
  disabled,
  required,
  'aria-describedby': describedBy,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const messageId = useId()
  const [files, setFiles] = useState<File[]>([])
  const [problems, setProblems] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const field = useFieldControl({
    id,
    disabled,
    required,
    invalid: invalid ?? (problems.length > 0 || undefined),
    'aria-describedby': [describedBy, problems.length ? messageId : undefined].filter(Boolean).join(' ') || undefined,
  })

  /** Mirror the list into the native input (not possible in every browser; the callback still fires) */
  const sync = (next: File[]) => {
    const input = inputRef.current
    if (!input) return
    try {
      const transfer = new DataTransfer()
      for (const f of next) transfer.items.add(f)
      input.files = transfer.files
    } catch {
      if (!next.length) input.value = ''
    }
  }

  const update = (next: File[]) => {
    setFiles(next)
    sync(next)
    onFilesChange?.(next)
  }

  const add = (incoming: File[]) => {
    const issues: string[] = []
    const fit = incoming.filter((f) => {
      if (!accepts(f, accept)) issues.push(`${f.name} isn’t an accepted file type.`)
      else if (maxSize !== undefined && f.size > maxSize) issues.push(`${f.name} is over ${formatBytes(maxSize)}.`)
      else return true
      return false
    })
    let next = multiple ? [...files, ...fit.filter((f) => !files.some((g) => sameFile(f, g)))] : fit.slice(0, 1)
    if (multiple && maxFiles !== undefined && next.length > maxFiles) {
      issues.push(`Only ${maxFiles} ${maxFiles === 1 ? 'file' : 'files'} can be added.`)
      next = next.slice(0, maxFiles)
    }
    setProblems(issues)
    update(next)
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <label
        onDragEnter={(e) => {
          e.preventDefault()
          if (!field.disabled) setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!field.disabled) add([...e.dataTransfer.files])
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-line bg-fill px-6 py-7 text-center transition-colors',
          'hover:border-brand/50 hover:bg-brand-wash has-focus-visible:border-brand has-focus-visible:bg-brand-wash',
          dragging && 'border-brand bg-brand-tint',
          field.invalid && 'border-danger',
          field.disabled && 'cursor-not-allowed opacity-60 hover:border-line hover:bg-fill'
        )}
      >
        <Upload size={22} className={cn('text-ink-faint', dragging && 'text-brand')} aria-hidden />
        <span className="text-[0.9rem] text-ink">
          {dragging ? 'Drop to add' : multiple ? 'Drop files here or ' : 'Drop a file here or '}
          {dragging ? null : <span className="font-semibold text-brand underline underline-offset-2">browse</span>}
        </span>
        {hint ? <span className="text-[0.8rem] text-muted">{hint}</span> : null}
        <input
          {...props}
          {...field.controlProps}
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => add([...(e.target.files ?? [])])}
          className="sr-only"
        />
      </label>

      {problems.length ? (
        <ul id={messageId} role="alert" className="m-0 flex list-none flex-col gap-1 p-0 text-[0.8rem] font-semibold text-danger">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}

      {files.length ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Chosen files">
          {files.map((f) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2">
              <FileText size={18} className="shrink-0 text-brand" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[0.85rem] font-semibold text-ink">{f.name}</span>
                <span className="text-[0.75rem] text-muted">{formatBytes(f.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setProblems([])
                  update(files.filter((g) => g !== f))
                }}
                disabled={field.disabled}
                aria-label={`Remove ${f.name}`}
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-brand-tint hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
              >
                <X size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
