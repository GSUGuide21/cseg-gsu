'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $findMatchingParent } from '@lexical/utils'
import { $getNodeByKey, $getRoot, $getSelection, $isElementNode, $isRangeSelection, $isTextNode, type LexicalEditor, type NodeKey } from 'lexical'
import { ChevronDown, ChevronUp, Replace, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FC, type KeyboardEvent } from 'react'

import { Button } from '../../Button'
import { Checkbox } from '../Checkbox'
import { Input } from '../Input'

export interface FindOptions {
  /** Capitals count: "Quad" doesn't find "quad" */
  matchCase?: boolean
  /** Only whole words: "cat" doesn't find "category" */
  wholeWord?: boolean
  /** The search is a pattern (a regular expression); the replacement can use $1 for what its first (…) found */
  pattern?: boolean
}

/** A piece of one match, in one run of text */
type Segment = { key: NodeKey; start: number; end: number }

/** A match: the text it found, and where, in one or more runs of text (formatting can change partway) */
export type FindMatch = { text: string; segments: Segment[] }

/** Letters and numbers in any language, for telling where a word ends */
const WORD = '[\\p{L}\\p{N}_]'

/** What to search for, as a pattern; or why it can't be one */
export const findPattern = (query: string, { matchCase = false, wholeWord = false, pattern = false }: FindOptions = {}): { re: RegExp } | { error: string } | null => {
  if (!query) return null
  const source = pattern ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const bounded = wholeWord ? `(?<!${WORD})(?:${source})(?!${WORD})` : source
  try {
    return { re: new RegExp(bounded, `gu${matchCase ? '' : 'i'}`) }
  } catch {
    return { error: 'That pattern isn’t one that can be searched for.' }
  }
}

/**
 * Every match in the writing, in reading order. A block's text is searched as one, so
 * words whose formatting changes partway (half bold, or partly a link) are still found.
 */
export const $findMatches = (re: RegExp | null): FindMatch[] => {
  if (!re) return []
  // The writing as runs of text, a run for each block (a paragraph, a heading, a cell)
  const runs: { text: string; nodes: { key: NodeKey; from: number; to: number }[] }[] = []
  let block: NodeKey | null = null
  for (const node of $getRoot().getAllTextNodes()) {
    const owner = $findMatchingParent(node, (n) => $isElementNode(n) && !n.isInline())?.getKey() ?? null
    if (owner !== block || !runs.length) {
      runs.push({ text: '', nodes: [] })
      block = owner
    }
    const run = runs[runs.length - 1]
    const text = node.getTextContent()
    run.nodes.push({ key: node.getKey(), from: run.text.length, to: run.text.length + text.length })
    run.text += text
  }
  const matches: FindMatch[] = []
  for (const run of runs) {
    re.lastIndex = 0
    for (let m = re.exec(run.text); m; m = re.exec(run.text)) {
      // A pattern that matches nothing (like ^) would find the same place forever
      if (!m[0]) {
        re.lastIndex++
        continue
      }
      const start = m.index
      const end = start + m[0].length
      const segments = run.nodes.filter((n) => n.to > start && n.from < end).map((n) => ({ key: n.key, start: Math.max(start, n.from) - n.from, end: Math.min(end, n.to) - n.from }))
      matches.push({ text: m[0], segments })
    }
  }
  return matches
}

/**
 * Puts each match's replacement where it was, last first, so the places of the ones before
 * stay right. A match across runs of text takes the first run's formatting.
 */
export const $replaceMatches = (matches: readonly FindMatch[], replacementFor: (m: FindMatch) => string) => {
  const selection = $getSelection()
  const points = $isRangeSelection(selection) ? [selection.anchor, selection.focus] : []
  for (const m of [...matches].reverse()) {
    const replacement = replacementFor(m)
    const first = m.segments[0]
    m.segments.forEach((seg, i) => {
      const node = $getNodeByKey(seg.key)
      if (!$isTextNode(node)) return
      const inserted = i === 0 ? replacement.length : 0
      node.spliceText(seg.start, seg.end - seg.start, i === 0 ? replacement : '', false)
      // The cursor moves with the text it was in, so it never points past the end of a run
      for (const point of points) {
        if (point.key !== seg.key || point.type !== 'text') continue
        if (point.offset >= seg.end) point.set(seg.key, point.offset - (seg.end - seg.start) + inserted, 'text')
        else if (point.offset > seg.start) point.set(seg.key, seg.start + inserted, 'text')
      }
      // A run left with nothing in it goes, the cursor going to the end of the replacement
      if (i > 0 && !node.getTextContentSize()) {
        for (const point of points) if (point.key === seg.key) point.set(first.key, first.start + replacement.length, 'text')
        node.remove()
      }
    })
  }
}

/** The page's text node for a run of text, for the browser to highlight in */
const textOf = (editor: LexicalEditor, key: NodeKey) => {
  const element = editor.getElementByKey(key)
  return element ? (document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode() as Text | null) : null
}

/** The page's range over a match; null if it isn't drawn */
const rangeOf = (editor: LexicalEditor, m: FindMatch): Range | null => {
  const first = m.segments[0]
  const last = m.segments[m.segments.length - 1]
  const from = first && textOf(editor, first.key)
  const to = last && textOf(editor, last.key)
  if (!from || !to || from.length < first.start || to.length < last.end) return null
  const range = document.createRange()
  range.setStart(from, first.start)
  range.setEnd(to, last.end)
  return range
}

type Highlights = { set: (name: string, value: unknown) => void; delete: (name: string) => void }
const highlightRegistry = () => (typeof CSS !== 'undefined' ? ((CSS as unknown as { highlights?: Highlights }).highlights ?? null) : null)
const HighlightClass = () => (typeof window !== 'undefined' ? ((window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight ?? null) : null)

/**
 * Find and replace, in a bar over the writing: every match is highlighted (where the
 * browser can), Enter goes to the next and Shift+Enter the one before, and Replace changes
 * the one that's picked out. Whole words and patterns narrow the search. Escape closes it
 * and goes back to the writing.
 */
export const FindReplace: FC<{ onClose: () => void }> = ({ onClose }) => {
  const [editor] = useLexicalComposerContext()
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [pattern, setPattern] = useState(false)
  const [matches, setMatches] = useState<FindMatch[]>([])
  const [current, setCurrent] = useState(0)
  const [replaced, setReplaced] = useState<number | null>(null)
  const findRef = useRef<HTMLInputElement>(null)
  const at = matches.length ? Math.min(current, matches.length - 1) : 0
  const found = useMemo(() => findPattern(query, { matchCase, wholeWord, pattern }), [query, matchCase, wholeWord, pattern])
  const re = found && 're' in found ? found.re : null
  const error = found && 'error' in found ? found.error : ''

  useEffect(() => {
    findRef.current?.focus()
  }, [])

  // The matches, again whenever the writing changes
  useEffect(() => {
    const read = () => editor.getEditorState().read(() => setMatches($findMatches(re)))
    read()
    return editor.registerUpdateListener(read)
  }, [editor, re])

  // Every match highlighted, and the picked one more strongly, without moving the cursor or focus
  useEffect(() => {
    const registry = highlightRegistry()
    const Highlight = HighlightClass()
    if (!registry || !Highlight) return
    const ranges = matches.map((m) => rangeOf(editor, m))
    registry.set('rte-find', new Highlight(...ranges.filter((r, i): r is Range => !!r && i !== at)))
    const picked = ranges[at]
    if (picked) registry.set('rte-find-current', new Highlight(picked))
    else registry.delete('rte-find-current')
    return () => {
      registry.delete('rte-find')
      registry.delete('rte-find-current')
    }
  }, [editor, matches, at])

  // The picked match in view
  useEffect(() => {
    const key = matches[at]?.segments[0]?.key
    if (key) editor.getElementByKey(key)?.scrollIntoView?.({ block: 'nearest' })
  }, [editor, matches, at])

  /** What a match becomes: the replacement as typed, or with a pattern, with its $1 and so on filled in */
  const replacementFor = (m: FindMatch) => (pattern && re ? m.text.replace(new RegExp(re.source, re.flags.replace('g', '')), replacement) : replacement)

  const go = (by: 1 | -1) => {
    setReplaced(null)
    if (matches.length) setCurrent((at + by + matches.length) % matches.length)
  }

  const replaceOne = () => {
    const m = matches[at]
    if (!m) return
    // The next match takes this one's place in the list, so the picked one moves on by itself
    editor.update(() => $replaceMatches([m], replacementFor))
    setReplaced(1)
  }

  const replaceAll = () => {
    if (!matches.length) return
    const count = matches.length
    editor.update(() => $replaceMatches(matches, replacementFor))
    setReplaced(count)
  }

  const close = () => {
    onClose()
    editor.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  /** A change to what's searched for starts again at the first match */
  const option = (set: (v: boolean) => void) => (v: boolean) => {
    set(v)
    setCurrent(0)
    setReplaced(null)
  }

  const status = error
    ? 'Not a valid pattern'
    : replaced !== null
      ? `Replaced ${replaced === 1 ? '1 match' : `${replaced} matches`}`
      : !query
        ? ''
        : matches.length
          ? `${at + 1} of ${matches.length}`
          : 'No matches'

  return (
    <div role="search" aria-label="Find and replace" onKeyDown={onKeyDown} className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-line bg-surface px-3 py-2">
      <Input
        ref={findRef}
        size="sm"
        type="search"
        aria-label="Find"
        placeholder={pattern ? 'Find a pattern, like \\d+ for numbers' : 'Find'}
        leading={<Search size={14} aria-hidden />}
        invalid={!!error}
        title={error || undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setCurrent(0)
          setReplaced(null)
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          go(e.shiftKey ? -1 : 1)
        }}
        className="w-44 min-w-0 flex-1 sm:flex-none"
      />
      <span aria-live="polite" className={`min-w-16 text-[0.8rem] tabular-nums ${error ? 'font-semibold text-danger' : 'text-muted'}`}>
        {status}
      </span>
      <Button size="sm" variant="ghost" aria-label="Previous match" disabled={!matches.length} onClick={() => go(-1)}>
        <ChevronUp size={15} aria-hidden />
      </Button>
      <Button size="sm" variant="ghost" aria-label="Next match" disabled={!matches.length} onClick={() => go(1)}>
        <ChevronDown size={15} aria-hidden />
      </Button>
      <Checkbox checked={matchCase} onCheckedChange={option(setMatchCase)} className="text-[0.85rem]">
        Match case
      </Checkbox>
      <Checkbox checked={wholeWord} onCheckedChange={option(setWholeWord)} className="text-[0.85rem]">
        Whole words
      </Checkbox>
      <Checkbox checked={pattern} onCheckedChange={option(setPattern)} className="text-[0.85rem]" title="A regular expression; the replacement can use $1 for what its first (…) found">
        Pattern
      </Checkbox>
      <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
      <Input
        size="sm"
        aria-label="Replace with"
        placeholder={pattern ? 'Replace with ($1 for a group)' : 'Replace with'}
        leading={<Replace size={14} aria-hidden />}
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          replaceOne()
        }}
        className="w-44 min-w-0 flex-1 sm:flex-none"
      />
      <Button size="sm" variant="outline" disabled={!matches.length} onClick={replaceOne}>
        Replace
      </Button>
      <Button size="sm" variant="outline" disabled={!matches.length} onClick={replaceAll}>
        Replace all
      </Button>
      <Button size="sm" variant="ghost" aria-label="Close find and replace" className="ml-auto" onClick={close}>
        <X size={15} aria-hidden />
      </Button>
    </div>
  )
}
