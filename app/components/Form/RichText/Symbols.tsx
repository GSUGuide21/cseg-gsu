'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getPreviousSelection, $getRoot, $getSelection, $isRangeSelection, $setSelection } from 'lexical'
import { Smile } from 'lucide-react'
import { useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { Popover } from '../../Popover'

/** What people reach for in club writing: reactions, campus life, and the Panther's paw */
const EMOJI = '😀 😂 😊 😍 🥳 😎 🤔 😅 😢 👍 👏 🙌 🙏 💪 👋 🤝 ❤️ 💙 💛 💜 🔥 ✨ ⭐ 🎉 🎊 🎓 📚 📝 ✏️ 📅 📍 🕒 ⏰ 📣 💡 ✅ ❌ ⚠️ ❗ ❓ ☕ 🍕 🍔 🌮 🍩 🏀 ⚽ 🎵 🎨 🎮 📸 🚌 🚶 🏫 🐾'.split(' ')

/** Typed less often than they're needed: dashes, arrows, marks, money, and letters with accents */
const SYMBOLS = '— – … • · ° © ® ™ § ¶ † ← → ↑ ↓ ↔ ⇒ ✓ ✗ ★ ☆ ♥ ½ ¼ ¾ × ÷ ± ≈ ≠ ≤ ≥ ∞ ¢ € £ ¥ “ ” ‘ ’ « » ¡ ¿ á é í ó ú ñ ü ç'.split(' ')

const Grid: FC<{ title: string; items: string[]; onPick: (text: string) => void; className?: string }> = ({ title, items, onPick, className }) => (
  <section aria-label={title} className="flex flex-col gap-1.5">
    <h3 className="m-0 text-[0.75rem] font-bold tracking-wide text-muted uppercase">{title}</h3>
    <div className="grid grid-cols-8 gap-0.5">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className={cn('grid size-8 cursor-pointer place-items-center rounded-md transition-colors hover:bg-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand', className)}
        >
          {item}
        </button>
      ))}
    </div>
  </section>
)

/** Emoji and symbols, put in at the cursor; the cursor carries on after what went in */
export const SymbolTool: FC<{ disabled?: boolean; labeled?: boolean }> = ({ disabled, labeled = false }) => {
  const [editor] = useLexicalComposerContext()
  const [open, setOpen] = useState(false)

  const insert = (text: string) => {
    setOpen(false)
    editor.update(() => {
      // Focus is in the panel, so the cursor is where it was before it opened
      if (!$getSelection()) {
        const before = $getPreviousSelection()
        // Not clicked into yet: it goes at the end, as typing would
        if (before) $setSelection(before.clone())
        else $getRoot().selectEnd()
      }
      const selection = $getSelection()
      if ($isRangeSelection(selection)) selection.insertText(text)
    })
    editor.focus()
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      title="Insert a symbol"
      trigger={
        <button
          type="button"
          data-tool
          aria-label="Emoji and symbols"
          title="Emoji and symbols"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            'shrink-0 cursor-pointer rounded-md text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:size-4.5',
            labeled ? 'flex h-8 items-center gap-2 pr-2.5 pl-2 text-[0.8rem] font-semibold' : 'grid size-8 place-items-center'
          )}
        >
          <Smile />
          {labeled ? <span aria-hidden>Symbols</span> : null}
        </button>
      }
    >
      <div className="flex max-h-80 w-72 flex-col gap-3 overflow-y-auto">
        <Grid title="Emoji" items={EMOJI} onPick={insert} className="text-[1.1rem]" />
        <Grid title="Symbols and letters" items={SYMBOLS} onPick={insert} className="text-[0.95rem] text-ink" />
      </div>
    </Popover>
  )
}
