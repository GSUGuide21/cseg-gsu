'use client'

import type { FC } from 'react'

import { Dialog } from '../../Dialog'
import { Kbd } from '../../Kbd'
import { Portal } from '../../Portal'

/** Each shortcut: what it does, and its keys ("mod" is ⌘ on a Mac, Ctrl elsewhere); typed ones are what to type */
type Shortcut = { does: string; keys?: string[]; types?: string }

const GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: 'Text',
    items: [
      { does: 'Bold', keys: ['mod', 'B'] },
      { does: 'Italic', keys: ['mod', 'I'] },
      { does: 'Underline', keys: ['mod', 'U'] },
      { does: 'Strikethrough', keys: ['mod', 'shift', 'X'] },
      { does: 'Inline code', keys: ['mod', 'E'] },
      { does: 'A new line in the same paragraph', keys: ['shift', 'Enter'] },
      { does: 'Paste as plain text', keys: ['mod', 'shift', 'V'] },
    ],
  },
  {
    title: 'Blocks',
    items: [
      { does: 'Paragraph', keys: ['mod', 'alt', '0'] },
      { does: 'Heading 1 to 4', keys: ['mod', 'alt', '1–4'] },
      { does: 'Numbered list', keys: ['mod', 'shift', '7'] },
      { does: 'Bulleted list', keys: ['mod', 'shift', '8'] },
      { does: 'Checklist', keys: ['mod', 'shift', '9'] },
      { does: 'Move the block up or down', keys: ['alt', '↑ ↓'] },
      { does: 'Duplicate the block', keys: ['alt', 'shift', '↓'] },
      { does: 'Every block, by name', types: '/' },
    ],
  },
  {
    title: 'Typed at the start of a line',
    items: [
      { does: 'Heading 1, 2, 3', types: '#  ##  ###' },
      { does: 'Bulleted list', types: '-' },
      { does: 'Numbered list', types: '1.' },
      { does: 'Checklist', types: '[ ]' },
      { does: 'Quote', types: '>' },
      { does: 'Code block', types: '```' },
      { does: 'Divider', types: '---' },
    ],
  },
  {
    title: 'The editor',
    items: [
      { does: 'Undo', keys: ['mod', 'Z'] },
      { does: 'Redo', keys: ['mod', 'shift', 'Z'] },
      { does: 'Find and replace', keys: ['mod', 'F'] },
      { does: 'These shortcuts', keys: ['mod', '/'] },
      { does: 'Leave full screen', keys: ['Esc'] },
      { does: 'On to the next field', keys: ['Tab'] },
    ],
  },
]

/** Every keyboard shortcut the editor knows, and what can be typed to make a block */
export const ShortcutsDialog: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) =>
  open ? (
    <Portal>
      <Dialog open onClose={onClose} size="lg" title="Keyboard shortcuts" description="Type at the start of a line, or press the keys, to format without the toolbar.">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.title} aria-label={g.title} className="flex flex-col gap-1.5">
              <h3 className="m-0 text-[0.75rem] font-bold tracking-wide text-muted uppercase">{g.title}</h3>
              <dl className="m-0 flex flex-col divide-y divide-line">
                {g.items.map((s) => (
                  <div key={s.does} className="flex items-center justify-between gap-4 py-1.5">
                    <dt className="text-[0.88rem] text-ink">{s.does}</dt>
                    <dd className="m-0 shrink-0">
                      {s.keys ? <Kbd keys={s.keys} size="sm" /> : <code className="rounded bg-fill px-1.5 py-0.5 font-mono text-[0.8rem] text-ink">{s.types}</code>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </Dialog>
    </Portal>
  ) : null
