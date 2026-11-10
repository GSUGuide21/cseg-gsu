'use server'

import { draftMode } from 'next/headers'
import { revalidatePath } from 'next/cache'

/** Leaves draft mode: the site goes back to showing only what's published, on the same page */
export async function exitPreview() {
  ;(await draftMode()).disable()
  revalidatePath('/', 'layout')
}
