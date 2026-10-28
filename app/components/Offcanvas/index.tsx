'use client'

import { X } from 'lucide-react'
import { useId, useRef, type FC } from 'react'
import { tv } from 'tailwind-variants'

import { useModalDialog } from '../useModalDialog'
import type { OffcanvasProps } from './types'

const sheet = tv({
  base: [
    'fixed m-0 hidden open:flex max-h-none max-w-none flex-col overflow-hidden border-line bg-surface p-0 text-ink shadow-[0_0_40px_rgb(0_0_0/0.25)]',
    // Slides in from its edge, and back out on close (where the browser can animate <dialog>)
    'transition-[translate,overlay,display] duration-300 ease-out transition-discrete motion-reduce:transition-none',
    'backdrop:bg-black/0 backdrop:transition-[background-color,overlay,display] backdrop:duration-300 backdrop:transition-discrete',
    'open:backdrop:bg-black/45 starting:open:backdrop:bg-black/0',
  ],
  variants: {
    side: {
      right: 'inset-y-0 right-0 left-auto h-dvh border-l translate-x-full open:translate-x-0 starting:open:translate-x-full',
      left: 'inset-y-0 right-auto left-0 h-dvh border-r -translate-x-full open:translate-x-0 starting:open:-translate-x-full',
      top: 'inset-x-0 top-0 bottom-auto w-full border-b -translate-y-full open:translate-y-0 starting:open:-translate-y-full',
      bottom: 'inset-x-0 top-auto bottom-0 w-full rounded-t-2xl border-t translate-y-full open:translate-y-0 starting:open:translate-y-full',
    },
    size: { sm: '', md: '', lg: '' },
  },
  compoundVariants: [
    { side: ['left', 'right'], size: 'sm', class: 'w-[min(20rem,100vw)]' },
    { side: ['left', 'right'], size: 'md', class: 'w-[min(26rem,100vw)]' },
    { side: ['left', 'right'], size: 'lg', class: 'w-[min(36rem,100vw)]' },
    { side: ['top', 'bottom'], size: 'sm', class: 'max-h-[40dvh]' },
    { side: ['top', 'bottom'], size: 'md', class: 'max-h-[60dvh]' },
    { side: ['top', 'bottom'], size: 'lg', class: 'max-h-[85dvh]' },
  ],
  defaultVariants: { side: 'right', size: 'md' },
})

/**
 * A panel that slides in over the page from one edge: filters, a cart, settings, a menu.
 *
 *   <Offcanvas open={open} onClose={() => setOpen(false)} title="Filters" footer={<Button>Apply</Button>}>…</Offcanvas>
 *
 * Built on the browser's modal <dialog>: focus stays inside while it's open, the page behind
 * can't be used, Escape closes it, and focus goes back to what opened it. The page under it
 * doesn't scroll meanwhile.
 */
export const Offcanvas: FC<OffcanvasProps> = ({
  open,
  onClose,
  side = 'right',
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  className,
}) => {
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
      className={sheet({ side, size, className })}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={titleId} className="m-0 text-[1.1rem] leading-snug font-bold text-ink">
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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div> : null}
    </dialog>
  )
}
