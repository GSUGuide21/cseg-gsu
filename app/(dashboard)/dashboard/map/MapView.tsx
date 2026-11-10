'use client'

import { ExternalLink, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FC } from 'react'

import { ActionMenu, Badge, Button, Dialog, EmptyState, FilterBar, Table, useNotify, type FilterValues } from '@/components'
import { Field, Input, NumberInput, Select, Switch, TextArea } from '@/components/Form'
import { deletePlace, movePlace, savePlace } from '@/lib/dashboard/actions'
import { coordsFrom } from '@/lib/dashboard/validate'
import { PLACE_CATEGORIES } from '@/lib/data/places'
import type { MapPlaceRow } from '@/lib/supabase/types'

import { PinMap, PinPicker, type LatLng, type MapPin as Pin } from '../PinMap'
import { PageTitle, useAction } from '../ui'

const CATEGORY_OPTIONS = Object.entries(PLACE_CATEGORIES).map(([value, c]) => ({ value, label: c.label }))

const categoryColor = (category: string) => PLACE_CATEGORIES[category as keyof typeof PLACE_CATEGORIES]?.color

/** A campus place (one of the map's own, seeded with a slug) or one of the club's own pins */
type Kind = 'campus' | 'club'
const kindOf = (p: MapPlaceRow): Kind => (p.slug ? 'campus' : 'club')
const KIND: Record<Kind, { label: string; tone: 'neutral' | 'brand' }> = {
  campus: { label: 'Campus place', tone: 'neutral' },
  club: { label: 'Club pin', tone: 'brand' },
}

/** The club's pins on a map: shown ones in their category's color, hidden ones faint */
const asPins = (places: MapPlaceRow[]): Pin[] =>
  places.map((p) => ({ id: p.id, label: p.published ? p.name : `${p.name} (hidden)`, lat: p.lat, lng: p.lng, color: categoryColor(p.category), muted: !p.published }))

const PlaceDialog: FC<{ place: MapPlaceRow | null; start?: LatLng | null; others: Pin[]; open: boolean; onClose: () => void }> = ({ place, start, others, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [lat, setLat] = useState<number | null>(place?.lat ?? start?.lat ?? null)
  const [lng, setLng] = useState<number | null>(place?.lng ?? start?.lng ?? null)
  const formId = place ? `place-${place.id}` : 'place-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      title={place ? `Edit ${place.name}` : 'Add a pin'}
      description={
        place?.slug
          ? 'One of the campus map’s own places: links, routes, and tours find it by its id, so those keep working when it’s renamed or moved.'
          : 'Club spots on the campus map: where meetings happen, where to find officers.'
      }
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
        <PinPicker
          value={lat !== null && lng !== null ? { lat, lng } : null}
          onChange={(at) => {
            setLat(at.lat)
            setLng(at.lng)
          }}
          context={others}
        />
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
  // Where a new pin starts: a spot clicked on the map, or nowhere yet
  const [start, setStart] = useState<LatLng | null>(null)
  const open = (p: MapPlaceRow | 'new', at: LatLng | null = null) => {
    setDialogKey((k) => k + 1)
    setStart(at)
    setEditing(p)
  }
  // Pins as last saved, moved right away when dragged (the server catches up)
  const [moved, setMoved] = useState<Record<string, LatLng>>({})
  const shown = places.map((p) => (moved[p.id] ? { ...p, ...moved[p.id] } : p))
  // What the map and the list show: by kind, category, and name or address
  const [filters, setFilters] = useState<FilterValues>({})
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const listed = shown.filter(
    (p) =>
      (!filters.kind?.length || filters.kind.includes(kindOf(p))) &&
      (!filters.category?.length || filters.category.includes(p.category)) &&
      (!q || p.name.toLowerCase().includes(q) || !!p.address?.toLowerCase().includes(q))
  )

  /** A dragged pin is saved where it's dropped; Undo puts it back */
  const move = async (id: string, to: LatLng) => {
    const place = shown.find((p) => p.id === id)
    if (!place) return
    const from = { lat: place.lat, lng: place.lng }
    setMoved((m) => ({ ...m, [id]: to }))
    const result = await movePlace(id, to.lat, to.lng)
    if (!result.ok) {
      setMoved((m) => ({ ...m, [id]: from }))
      return toast({ variant: 'error', title: 'Couldn’t move it', message: result.error })
    }
    router.refresh()
    toast({
      variant: 'success',
      title: `Moved ${place.name}`,
      action: {
        label: 'Undo',
        onClick: async () => {
          setMoved((m) => ({ ...m, [id]: from }))
          const back = await movePlace(id, from.lat, from.lng)
          if (!back.ok) toast({ variant: 'error', title: 'Couldn’t move it back', message: back.error })
          router.refresh()
        },
      },
    })
  }
  return (
    <>
      <PageTitle
        icon={<MapPin />}
        title="Map"
        description="The campus map’s buildings and spaces, and the club’s own pins. Food spots are under Eateries."
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
      <FilterBar
        className="mb-4"
        filters={[
          {
            id: 'kind',
            label: 'Kind',
            options: (Object.keys(KIND) as Kind[]).map((k) => ({ value: k, label: KIND[k].label, count: shown.filter((p) => kindOf(p) === k).length })),
          },
          {
            id: 'category',
            label: 'Category',
            options: CATEGORY_OPTIONS.map((o) => ({ ...o, count: shown.filter((p) => p.category === o.value).length })).filter((o) => o.count),
          },
        ]}
        value={filters}
        onValueChange={setFilters}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search places and pins"
        resultCount={listed.length}
      />
      {/* The places listed below: drag one to move it, click it to edit, or click anywhere to add a pin there */}
      <section aria-label="The places on a map" className="mb-6 flex flex-col gap-1.5">
        <PinMap
          label="The places listed: drag one to move it, click one to edit it, or click the map to add a pin there"
          className="h-[min(26rem,55vh)]"
          pins={asPins(listed)}
          draggable={() => true}
          onMove={move}
          onPick={(id) => {
            const p = shown.find((x) => x.id === id)
            if (p) open(p)
          }}
          onMapClick={(at) => open('new', at)}
        />
        <p className="m-0 text-[0.8rem] text-muted">Drag a pin to move it (it saves right away). Click a pin to edit it, or anywhere on the map to add one there. Faint pins are hidden from the site.</p>
      </section>
      <Table
        caption="Map places and pins"
        hideCaption
        rows={listed}
        getRowId={(p) => p.id}
        defaultSort={{ key: 'name', direction: 'ascending' }}
        empty={
          shown.length ? (
            <EmptyState size="sm" icon={<MapPin />} title="Nothing matches" />
          ) : (
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
          )
        }
        columns={[
          { key: 'name', header: 'Name', sortable: true, cell: (p) => <span className="flex min-w-0 flex-col">{p.name}{p.address ? <span className="text-[0.8rem] font-normal text-muted">{p.address}</span> : null}</span> },
          {
            key: 'kind',
            header: 'Kind',
            sortable: true,
            sortValue: (p) => KIND[kindOf(p)].label,
            cell: (p) => (
              <Badge size="sm" tone={KIND[kindOf(p)].tone}>
                {KIND[kindOf(p)].label}
              </Badge>
            ),
          },
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
              ...(p.published ? [{ label: 'View on the map', icon: <ExternalLink />, href: `/map?place=${p.slug ?? `club-${p.id}`}` }] : []),
              'separator',
              {
                label: 'Delete',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  // A seeded building's slug is what links, routes, and eateries point at
                  const message = p.slug
                    ? 'It comes off the map right away, and links, routes, and tours to it stop working. To take it off the map for now, hide it instead.'
                    : 'It comes off the map right away.'
                  if (!(await confirm({ title: `Delete ${p.name}?`, message, variant: 'error', confirmLabel: 'Delete' }))) return
                  const result = await deletePlace(p.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t delete', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <PlaceDialog
        key={dialogKey}
        place={editing === 'new' ? null : editing}
        start={start}
        // The other pins, faint, for bearings while placing this one
        others={asPins(shown.filter((p) => editing === 'new' || p.id !== editing?.id))}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </>
  )
}
