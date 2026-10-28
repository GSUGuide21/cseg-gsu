'use client'

import { X } from 'lucide-react'
import { useId, useRef, type FC } from 'react'
import { tv } from 'tailwind-variants'

import { useModalDialog } from '../useModalDialog'
import type { DialogProps } from './types'

const panel = tv({
  base: [
    'm-auto hidden open:flex max-h-[min(44rem,calc(100dvh-2rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_64px_rgb(0_0_0/0.25)]',
    // Fades and rises in, and back out on close (where the browser can animate <dialog>)
    'translate-y-2 scale-[0.98] opacity-0 open:translate-y-0 open:scale-100 open:opacity-100 starting:open:translate-y-2 starting:open:scale-[0.98] starting:open:opacity-0',
    'transition-[opacity,translate,scale,overlay,display] duration-200 ease-out transition-discrete motion-reduce:transition-none',
    'backdrop:bg-black/0 backdrop:transition-[background-color,overlay,display] backdrop:duration-200 backdrop:transition-discrete',
    'open:backdrop:bg-black/45 starting:open:backdrop:bg-black/0',
  ],
  variants: {
    size: { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' },
  },
  defaultVariants: { size: 'md' },
})

/**
 * A window over the page for a short task: edit a member, add an event, see details.
 *
 *   <Dialog open={open} onClose={() => setOpen(false)} title="Edit member"
 *     footer={<><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={save}>Save</Button></>}>
 *     …
 *   </Dialog>
 *
 * Built on the browser's modal <dialog>: focus moves inside and stays there, the page behind
 * can't be used or scrolled, Escape closes it, and focus goes back to what opened it. For a
 * yes/no question, useNotify().confirm is the better fit.
 */
export const Dialog: FC<DialogProps> = ({ open, onClose, title, description, children, footer, size = 'md', closeOnBackdrop = true, className }) => {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useModalDialog(ref, open)

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Escape: let the parent decide (it owns `open`)
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // A click on the dimmed page lands on the <dialog> itself, outside its contents
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
      className={panel({ size, className })}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={titleId} className="m-0 text-[1.15rem] leading-snug font-bold text-ink">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="m-0 text-[0.88rem] text-muted">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mt-1 -mr-2 grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
        >
          <X size={19} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-3">{children}</div>
      {footer ? <div className="flex flex-wrap-reverse items-center justify-end gap-2 border-t border-line bg-fill px-6 py-3.5">{footer}</div> : null}
    </dialog>
  )
}
