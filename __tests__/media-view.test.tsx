import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { NotificationProvider } from '@/components'
import { deleteMedia, listMedia, uploadImage, type MediaFile } from '../app/lib/dashboard/media'

import { MediaPicker } from '../app/(dashboard)/dashboard/MediaPicker'
import { MediaView } from '../app/(dashboard)/dashboard/media/MediaView'

const FILES: MediaFile[] = [
  { path: '2026/10/used.jpg', url: 'https://cdn.test/2026/10/used.jpg', size: 2048, createdAt: '2026-10-05T15:00:00Z' },
  { path: '2026/10/spare.png', url: 'https://cdn.test/2026/10/spare.png', size: 4096, createdAt: '2026-10-01T15:00:00Z' },
]

jest.mock('../app/lib/dashboard/media', () => ({
  ...jest.requireActual('../app/lib/dashboard/media'),
  listMedia: jest.fn(),
  deleteMedia: jest.fn(async () => {}),
  uploadImage: jest.fn(async () => 'https://cdn.test/new.png'),
}))
const list = listMedia as jest.Mock

const show = async (usage: Record<string, string[]> = { '2026/10/used.jpg': ['Fall recap'] }) => {
  render(
    <NotificationProvider>
      <MediaView usage={usage} />
    </NotificationProvider>
  )
  await act(async () => {})
}

/** Answers the confirmation dialog */
const confirmDelete = async () => {
  const dialog = await screen.findByRole('alertdialog')
  const message = dialog.textContent
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
  })
  return message
}

describe('Media library', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    list.mockResolvedValue(FILES)
  })

  it('tells images in use from the rest', async () => {
    await show()
    expect(screen.getByText('2 images')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Not in use' }))
    expect(screen.getByText('1 image')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete spare.png' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete used.jpg' })).not.toBeInTheDocument()
  })

  it('warns where an image is used before deleting it', async () => {
    await show()
    fireEvent.click(screen.getByRole('button', { name: 'Delete used.jpg' }))
    expect(await confirmDelete()).toContain('Fall recap')
    expect(deleteMedia).toHaveBeenCalledWith('2026/10/used.jpg')
    expect(screen.queryByRole('button', { name: 'Delete used.jpg' })).not.toBeInTheDocument()
  })

  it('uploads each file chosen, then lists them again', async () => {
    await show()
    const files = [new File(['a'], 'a.png', { type: 'image/png' }), new File(['b'], 'b.png', { type: 'image/png' })]
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Upload images', { selector: 'input' }), { target: { files } })
    })
    expect(uploadImage).toHaveBeenCalledTimes(2)
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('says when the library can’t load', async () => {
    list.mockRejectedValue(new Error('Storage is down'))
    await show()
    expect(screen.getByText('Storage is down')).toBeInTheDocument()
  })

  it('offers a way forward when empty', async () => {
    list.mockResolvedValue([])
    await show({})
    expect(screen.getByText('No images yet')).toBeInTheDocument()
  })
})

describe('Image picker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    list.mockResolvedValue(FILES)
  })

  it('stays out of Storage until it’s opened', () => {
    render(<MediaPicker open={false} onClose={jest.fn()} onPick={jest.fn()} />)
    expect(list).not.toHaveBeenCalled()
  })

  it('gives back the image picked, and closes', async () => {
    const onPick = jest.fn()
    const onClose = jest.fn()
    render(<MediaPicker open onClose={onClose} onPick={onPick} />)
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: /spare\.png/ }))
    expect(onPick).toHaveBeenCalledWith('https://cdn.test/2026/10/spare.png')
    expect(onClose).toHaveBeenCalled()
  })
})
