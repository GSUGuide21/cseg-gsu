'use client'

import { Pencil, Plus, Route, Trash2, Undo2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type FC } from 'react'

import { ActionMenu, Badge, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { Field, Input, Select, Switch, TextArea } from '@/components/Form'
import { CONNECTION_KINDS, connectionKindLabel, pathText } from '@/lib/connections'
import { deleteConnection, saveConnection } from '@/lib/dashboard/actions'
import { CONNECTION_POINTS_MAX, parsePath } from '@/lib/dashboard/validate'
import { placesWithEateries } from '@/lib/data/places'
import type { MapConnectionRow } from '@/lib/supabase/types'

import { PinMap, type LatLng } from '../PinMap'
import { PageTitle, useAction } from '../ui'

/** The map's buildings and spaces, which an indoor link or skybridge can join */
const BUILDINGS = placesWithEateries([]).sort((a, b) => a.name.localeCompare(b.name))
const BUILDING_OPTIONS = BUILDINGS.map((p) => ({ value: p.id, label: p.name }))
const buildingName = (id: string) => BUILDINGS.find((p) => p.id === id)?.name ?? id

/** Rounded as the coordinate fields keep them (about 10 cm) */
const round = (n: number) => Number(n.toFixed(6))

/**
 * Its line, two ways: click the map to add a point (drag one to move it), or type "lat, lng"
 * a line. The text box is what's sent; the map follows it while it reads as a path.
 */
const PathEditor: FC<{ defaultValue: string; error?: string }> = ({ defaultValue, error }) => {
  const [value, setValue] = useState(defaultValue)
  const points = useMemo(() => parsePath(value), [value])
  // The last good line, so a half-typed one doesn't empty the map
  const [shown, setShown] = useState<[number, number][]>(() => parsePath(defaultValue) ?? [])
  const current = points ?? shown
  const write = (next: [number, number][]) => {
    setShown(next)
    setValue(pathText(next))
  }
  // Opens on its line, then stays put while points are added
  const [focus] = useState<LatLng | null>(() => (current.length ? { lat: current[0][0], lng: current[0][1] } : null))

  return (
    <div className="flex flex-col gap-2">
      <PinMap
        label="Its line: click the map to add a point, or drag a point to move it"
        className="h-72"
        pins={current.map(([lat, lng], i) => ({ id: String(i), label: `Point ${i + 1}`, lat, lng, color: i === 0 || i === current.length - 1 ? '#0039a6' : '#64748b' }))}
        draggable={() => true}
        onMove={(id, at) => write(current.map((p, i) => (i === Number(id) ? [round(at.lat), round(at.lng)] : p)))}
        onMapClick={(at) => current.length < CONNECTION_POINTS_MAX && write([...current, [round(at.lat), round(at.lng)]])}
        focus={focus}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-[0.8rem] text-muted">
          {current.length < 2 ? 'Click the map where it starts, then where it ends (and anywhere it bends).' : `${current.length} points. Click to add one at the end; drag one to move it.`}
        </p>
        <Button size="sm" variant="outline" leading={<Undo2 size={14} aria-hidden />} disabled={!current.length} onClick={() => write(current.slice(0, -1))}>
          Remove the last point
        </Button>
      </div>
      <Field label="Points" required error={error} description="One “lat, lng” a line, in order from one end to the other.">
        <TextArea name="path" rows={4} value={value} onChange={(e) => setValue(e.target.value)} className="font-mono text-[0.85rem]" />
      </Field>
    </div>
  )
}

const ConnectionDialog: FC<{ connection: MapConnectionRow | null; open: boolean; onClose: () => void }> = ({ connection, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [inOsm, setInOsm] = useState(connection?.in_osm ?? false)
  const formId = connection ? `connection-${connection.id}` : 'connection-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      size="lg"
      title={connection ? `Edit ${connection.name}` : 'Add a skybridge or shortcut'}
      description="Drawn on the campus map, listed under Routes, and used by the route finder."
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
          run(() => saveConnection(connection?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <Field label="Name" required error={errors.name}>
            <Input name="name" defaultValue={connection?.name} autoComplete="off" placeholder="The Link" />
          </Field>
          <Field label="Kind" required error={errors.kind}>
            <Select name="kind" defaultValue={connection?.kind ?? null} placeholder="Pick one" options={CONNECTION_KINDS.map((k) => ({ value: k.value, label: k.label, description: k.description }))} />
          </Field>
        </div>
        <Field label="What to know" error={errors.note} description="Shown on the map and in the route’s steps: where it goes, and when it’s open.">
          <TextArea name="note" rows={2} defaultValue={connection?.note ?? ''} />
        </Field>
        <PathEditor defaultValue={connection ? pathText(connection.path) : ''} error={errors.path} />
        <Field label="The buildings it joins" error={errors.ends} description="For an indoor link or skybridge: routes go in and out through their doors. Leave empty for an outdoor path.">
          <Select type="tags" name="ends" defaultValue={connection?.ends ?? []} placeholder="Search buildings" options={BUILDING_OPTIONS} />
        </Field>
        <Switch name="in_osm" checked={inOsm} onCheckedChange={setInOsm} description="Routes already use OpenStreetMap’s walkway; this only draws and explains it.">
          Already on OpenStreetMap
        </Switch>
        <div className="grid gap-4 sm:grid-cols-3">
          {inOsm ? (
            <Field label="Walkway width" error={errors.half_width} description="Meters either side of the line (8 if empty).">
              <Input name="half_width" type="number" step="0.5" min="0" defaultValue={connection?.half_width ?? ''} />
            </Field>
          ) : null}
          <Field label="Preference" error={errors.favor} description="Under 1 favors it, like 0.85.">
            <Input name="favor" type="number" step="0.05" min="0" max="2" defaultValue={connection?.favor ?? ''} />
          </Field>
          <Field label="Extra effort" error={errors.penalty} description="Meters added, like 60 for climbing floors.">
            <Input name="penalty" type="number" step="5" min="0" defaultValue={connection?.penalty ?? ''} />
          </Field>
        </div>
        <Switch name="stairs" defaultChecked={connection?.stairs ?? false} description="Routes that avoid stairs go around it.">
          Only reachable by stairs
        </Switch>
        <Switch name="published" defaultChecked={connection?.published ?? true} description="Hidden ones stay here, off the map and out of routes.">
          On the map
        </Switch>
      </form>
    </Dialog>
  )
}

export const ConnectionsView: FC<{ connections: MapConnectionRow[] }> = ({ connections }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<MapConnectionRow | 'new' | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const open = (c: MapConnectionRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(c)
  }

  return (
    <>
      <PageTitle
        icon={<Route />}
        title="Skybridges & shortcuts"
        description="The ways across campus the map’s route finder knows beyond the sidewalks: skybridges, ways through buildings, and paths."
        actions={
          <>
            <Button href="/map" size="sm" variant="outline" external>
              Open the map
            </Button>
            <Button size="sm" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
              Add one
            </Button>
          </>
        }
      />
      <Table
        caption="Skybridges and shortcuts"
        hideCaption
        rows={connections}
        getRowId={(c) => c.id}
        empty={
          <EmptyState
            size="sm"
            icon={<Route />}
            title="None here yet"
            description="Until there are any, the map uses its built-in list. Run npm run connections:seed to copy that list in, or add the ones you know."
          />
        }
        columns={[
          {
            key: 'name',
            header: 'Name',
            sortable: true,
            cell: (c) => (
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold text-ink">{c.name}</span>
                {c.ends.length === 2 ? <span className="truncate text-[0.8rem] text-muted">{c.ends.map(buildingName).join(' ↔ ')}</span> : null}
              </span>
            ),
          },
          { key: 'kind', header: 'Kind', sortable: true, cell: (c) => connectionKindLabel(c.kind) },
          {
            key: 'in_osm',
            header: 'Routing',
            hideWhenStacked: true,
            cell: (c) => (
              <span className="flex flex-wrap gap-1.5">
                <Badge size="sm" tone={c.in_osm ? 'neutral' : 'info'}>
                  {c.in_osm ? 'From OpenStreetMap' : 'Added to routes'}
                </Badge>
                {c.stairs ? <Badge size="sm">Stairs</Badge> : null}
              </span>
            ),
          },
          {
            key: 'published',
            header: 'On the map',
            sortable: true,
            cell: (c) => (
              <Badge size="sm" dot tone={c.published ? 'success' : 'neutral'}>
                {c.published ? 'Shown' : 'Hidden'}
              </Badge>
            ),
          },
        ]}
        rowActions={(c) => (
          <ActionMenu
            label={`Actions for ${c.name}`}
            items={[
              { label: 'Edit', icon: <Pencil />, onSelect: () => open(c) },
              'separator',
              {
                label: 'Remove',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  if (!(await confirm({ title: `Remove ${c.name}?`, message: 'It comes off the map, and routes stop using it. To keep it for later, hide it instead.', variant: 'error', confirmLabel: 'Remove' })))
                    return
                  const result = await deleteConnection(c.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t remove', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <ConnectionDialog key={dialogKey} connection={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </>
  )
}
