import { deleteMedia, formatBytes, listAudio, listImages, listMedia } from '../app/lib/dashboard/media'

// A bucket filed the way uploads file it: year, then month. Folders have no id.
const file = (id: string, name: string, created_at: string, size = 2048) => ({ id, name, created_at, metadata: { size } })
const FOLDERS: Record<string, { id: string | null; name: string }[]> = {
  '': [{ id: null, name: '2026' }, file('a', 'logo.PNG', '2026-01-01T00:00:00Z')],
  '2026': [{ id: null, name: '10' }],
  '2026/10': [file('b', 'photo.jpg', '2026-10-05T00:00:00Z'), file('c', 'song.mp3', '2026-10-01T00:00:00Z'), file('d', '.emptyFolderPlaceholder', '2026-10-01T00:00:00Z')],
}

const list = jest.fn(async (folder: string) => ({ data: FOLDERS[folder], error: null as { message: string } | null }))
const getPublicUrl = (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } })
const remove = jest.fn(async () => ({ data: [{ name: 'x' }] as unknown[], error: null as { message: string } | null })) as jest.Mock

jest.mock('../app/lib/supabase/client', () => ({
  createClient: () => ({ storage: { from: () => ({ list, getPublicUrl, remove }) } }),
}))

describe('The media bucket', () => {
  it('finds files inside the year and month folders, newest first, and not the folders themselves', async () => {
    const files = await listMedia()
    expect(files.map((f) => f.path)).toEqual(['2026/10/photo.jpg', '2026/10/song.mp3', 'logo.PNG'])
    expect(files[0]).toEqual({ path: '2026/10/photo.jpg', url: 'https://cdn.test/2026/10/photo.jpg', size: 2048, createdAt: '2026-10-05T00:00:00Z' })
  })

  it('narrows to a type, whatever the case of the extension', async () => {
    expect((await listImages()).map((f) => f.path)).toEqual(['2026/10/photo.jpg', 'logo.PNG'])
    expect((await listAudio()).map((f) => f.path)).toEqual(['2026/10/song.mp3'])
  })

  it('says why when Storage turns the request down', async () => {
    list.mockResolvedValueOnce({ data: [], error: { message: 'Bucket not found' } })
    await expect(listMedia()).rejects.toThrow('Bucket not found')
  })

  it('deletes by path, and notices when nothing was actually removed', async () => {
    await deleteMedia('2026/10/photo.jpg')
    expect(remove).toHaveBeenCalledWith(['2026/10/photo.jpg'])
    remove.mockResolvedValueOnce({ data: [], error: null })
    await expect(deleteMedia('2026/10/photo.jpg')).rejects.toThrow('Only officers can delete images')
  })

  it('writes file sizes for people', () => {
    expect(formatBytes(340 * 1024)).toBe('340 KB')
    expect(formatBytes(2.4 * 1024 * 1024)).toBe('2.4 MB')
    expect(formatBytes(null)).toBeNull()
  })
})
