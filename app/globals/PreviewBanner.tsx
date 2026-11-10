import { draftMode } from 'next/headers'

import { exitPreview } from '@/lib/dashboard/preview'

/**
 * While an officer previews drafts (draft mode, from the editor), a bar along the bottom of
 * the site says so, with a way out. Nobody else ever sees it.
 */
export async function PreviewBanner() {
  if (!(await draftMode()).isEnabled) return null
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[60] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-[#facc15] px-4 py-2 text-center text-[0.85rem] font-semibold text-[#1c1917]">
      <span>Previewing drafts: you see unpublished changes here, visitors don’t.</span>
      <form action={exitPreview}>
        <button type="submit" className="cursor-pointer rounded-md bg-[#1c1917] px-3 py-1 text-[0.8rem] font-bold text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1917]">
          Exit preview
        </button>
      </form>
    </div>
  )
}
