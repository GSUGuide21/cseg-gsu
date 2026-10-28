'use client'

import { ExternalLink, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { ActionMenu, Badge, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { Field, Input, NumberInput, Select, Switch, TextArea } from '@/components/Form'
import { deletePlace, savePlace } from '@/lib/dashboard/actions'
import { coordsFrom } from '@/lib/dashboard/validate'
import { PLACE_CATEGORIES } from '@/lib/data/places'
import type { MapPlaceRow } from '@/lib/supabase/types'

import { PageTitle, useAction } from '../ui'

const CATEGORY_OPTIONS = Object.entries(PLACE_CATEGORIES).map(([value, c]) => ({ value, label: c.label }))

const PlaceDialog: FC<{ place: MapPlaceRow | null; open: boolean; onClose: () => void }> = ({ place, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [lat, setLat] = useState<number | null>(place?.lat ?? null)
  const [lng, setLng] = useState<number | null>(place?.lng ?? null)
  const formId = place ? `place-${place.id}` : 'place-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      title={place ? `Edit ${place.name}` : 'Add a pin'}
      description="Club spots on the campus map: where meetings happen, where to find officers."
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form={formId} loading={pending}>
            Save
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          run(() => savePlace(place?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <Field label="Name" required error={errors.name}>
          <Input name="name" defaultValue={place?.name} />
        </Field>
        <Field label="Category" error={errors.category}>
          <Select name="category" defaultValue={place?.category ?? 'student-life'} options={CATEGORY_OPTIONS} />
        </Field>
        <Field label="Paste a map link" description="From Google Maps or OpenStreetMap, to fill in the coordinates below.">
          <Input
            placeholder="https://www.google.com/maps/…@33.7531,-84.3853,…"
            onChange={(e) => {
              const c = coordsFrom(e.target.value)
              if (c) {
                setLat(c.lat)
                setLng(c.lng)
              }
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude" required error={errors.lat}>
            <NumberInput name="lat" value={lat} onValueChange={setLat} step={0.0001} stepper={false} />
          </Field>
          <Field label="Longitude" required error={errors.lng}>
            <NumberInput name="lng" value={lng} onValueChange={setLng} step={0.0001} stepper={false} />
          </Field>
        </div>
        <Field label="Address or room">
          <Input name="address" defaultValue={place?.address ?? ''} placeholder="Student Center West, room 259" />
        </Field>
        <Field label="Description">
          <TextArea name="description" rows={3} defaultValue={place?.description ?? ''} />
        </Field>
        <Switch name="published" defaultChecked={place?.published ?? true} description="Hidden pins stay here for later.">
          Show on the campus map
        </Switch>
      </form>
    </Dialog>
  )
}

export const MapView: FC<{ places: MapPlaceRow[] }> = ({ places }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<MapPlaceRow | 'new' | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const open = (p: MapPlaceRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(p)
  }
  return (
    <>
      <PageTitle
        title="Map"
        description="The club’s own pins, shown on the campus map with the built-in buildings and food spots."
        actions={
          <>
            <Button href="/map" size="sm" variant="outline" external>
              Open the map
            </Button>
            <Button size="sm" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
              Add a pin
            </Button>
          </>
        }
      />
      <Table
        caption="Map pins"
        hideCaption
        rows={places}
        getRowId={(p) => p.id}
        defaultSort={{ key: 'name', direction: 'ascending' }}
        empty={
          <EmptyState
            size="sm"
            icon={<MapPin />}
            title="No club pins yet"
            description="Add where meetings happen, so new members can find them."
            actions={
              <Button size="sm" onClick={() => open('new')}>
                Add a pin
              </Button>
            }
          />
        }
        columns={[
          { key: 'name', header: 'Name', sortable: true, cell: (p) => <span className="flex min-w-0 flex-col">{p.name}{p.address ? <span className="text-[0.8rem] font-normal text-muted">{p.address}</span> : null}</span> },
          { key: 'category', header: 'Category', sortable: true, cell: (p) => PLACE_CATEGORIES[p.category as keyof typeof PLACE_CATEGORIES]?.label ?? p.category },
          {
            key: 'published',
            header: 'On the map',
            sortable: true,
            cell: (p) => (
              <Badge size="sm" dot tone={p.published ? 'success' : 'neutral'}>
                {p.published ? 'Shown' : 'Hidden'}
              </Badge>
            ),
          },
          { key: 'lat', header: 'Coordinates', hideWhenStacked: true, cell: (p) => <span className="tabular-nums">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span> },
        ]}
        rowActions={(p) => (
          <ActionMenu
            label={`Actions for ${p.name}`}
            items={[
              { label: 'Edit', icon: <Pencil />, onSelect: () => open(p) },
              ...(p.published ? [{ label: 'View on the map', icon: <ExternalLink />, href: `/map?place=club-${p.id}` }] : []),
              'separator',
              {
                label: 'Delete',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  if (!(await confirm({ title: `Delete ${p.name}?`, message: 'It comes off the map right away.', variant: 'error', confirmLabel: 'Delete' }))) return
                  const result = await deletePlace(p.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t delete', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <PlaceDialog key={dialogKey} place={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </>
  )
}
