/** A file's path in the media bucket, from its public address */
const MEDIA_ADDRESS = /\/storage\/v1\/object\/public\/media\/([^"'\s)\\?#&]+)/g

/**
 * Which documents use which files in the media bucket: path to titles. Goes by the addresses
 * in each document's fields, wherever they sit (a cover, the body, a section).
 */
export const mediaUsage = (docs: { title: string; fields: unknown }[]) => {
  const used: Record<string, string[]> = {}
  for (const { title, fields } of docs) {
    for (const [, path] of JSON.stringify(fields).matchAll(MEDIA_ADDRESS)) {
      const titles = (used[path] ??= [])
      if (!titles.includes(title)) titles.push(title)
    }
  }
  return used
}
