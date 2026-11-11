'use client'

import { ArrowDownUp, CalendarCheck, Layers, MapPin, Pencil, Plus, Trash2, Utensils } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, type FC } from 'react'

import { ActionMenu, Badge, Button, Dialog, EmptyState, Table, useNotify } from '@/components'
import { DatePicker, Field, Input, NumberInput, Select, Switch, TagInput, TextArea } from '@/components/Form'
import { deleteEatery, markEateriesChecked, reorderEateries, saveAreas, saveEatery } from '@/lib/dashboard/actions'
import { coordsFrom, TIP_MAX } from '@/lib/dashboard/validate'
import { PLACES } from '@/lib/data/places'
import { atlantaToday, shortDate } from '@/lib/eateries'
import type { EateryAreaRow, EateryClosureRow, EateryRow, HoursRangeJson } from '@/lib/supabase/types'

import { PinPicker } from '../PinMap'
import { PageTitle, useAction } from '../ui'
import { ArrangeDialog } from '../ArrangeDialog'
import { GroupsDialog } from '../GroupsDialog'
import { ClosuresPanel } from './ClosuresPanel'
import { HoursEditor } from './HoursEditor'

const PLACE_OPTIONS = [...PLACES].sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ value: p.id, label: p.name }))

type Location = { key: number; id?: string; label: string; lat: number | null; lng: number | null; schedule: HoursRangeJson[] | null }

let nextKey = 0

/** A listing with several spots (e.g. cafés in four buildings): one pin each, with its own hours */
const LocationsEditor: FC<{ initial: EateryRow['locations']; error?: string }> = ({ initial, error }) => {
  const [rows, setRows] = useState<Location[]>(() => initial.map((l) => ({ key: nextKey++, ...l, schedule: l.schedule ?? null })))
  const update = (key: number, patch: Partial<Location>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const saved = rows.map(({ id, label, lat, lng, schedule }) => ({ id, label, lat, lng, schedule }))
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-[0.85rem] font-semibold text-ink">Locations</legend>
      <p className="-mt-1 text-[0.8rem] text-muted">Only for a listing in several places. Each gets its own pin and hours, in place of the pin above.</p>
      <input type="hidden" name="locations" value={JSON.stringify(saved)} />
      {rows.map((r) => (
        <div key={r.key} className="flex flex-col gap-3 rounded-lg border border-line p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Name">
              <Input size="sm" value={r.label} onChange={(e) => update(r.key, { label: e.target.value })} placeholder="Student Center East" />
            </Field>
            <Field label="Coordinates or map link" description={r.lat !== null && r.lng !== null ? `${r.lat}, ${r.lng}` : undefined}>
              <Input
                size="sm"
                defaultValue={r.lat !== null && r.lng !== null ? `${r.lat}, ${r.lng}` : ''}
                placeholder="33.7527, -84.3850"
                onChange={(e) => {
                  const c = coordsFrom(e.target.value)
                  update(r.key, c ? c : { lat: null, lng: null })
                }}
              />
            </Field>
            <Button size="sm" variant="ghost" leading={<Trash2 size={14} aria-hidden />} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
              Remove
            </Button>
          </div>
          <HoursEditor label="Hours here" initial={r.schedule} onChange={(schedule) => update(r.key, { schedule })} />
        </div>
      ))}
      {error ? <p className="text-[0.8rem] font-semibold text-danger">{error}</p> : null}
      <Button size="sm" variant="outline" className="self-start" leading={<Plus size={14} aria-hidden />} onClick={() => setRows((rs) => [...rs, { key: nextKey++, label: '', lat: null, lng: null, schedule: null }])}>
        Add a location
      </Button>
    </fieldset>
  )
}

const EateryDialog: FC<{ eatery: EateryRow | null; areas: EateryAreaRow[]; nextSort: number; open: boolean; onClose: () => void }> = ({ eatery, areas, nextSort, open, onClose }) => {
  const router = useRouter()
  const { pending, errors, run } = useAction()
  const [lat, setLat] = useState<number | null>(eatery?.lat ?? null)
  const [lng, setLng] = useState<number | null>(eatery?.lng ?? null)
  const formId = eatery ? `eatery-${eatery.id}` : 'eatery-new'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      closeOnBackdrop={false}
      title={eatery ? `Edit ${eatery.name}` : 'Add an eatery'}
      description="Shown on Places to Eat (and any page’s Eateries block) and as a Food pin on the campus map."
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
          run(() => saveEatery(eatery?.id ?? null, new FormData(e.currentTarget)), () => {
            onClose()
            router.refresh()
          })
        }}
      >
        <Field label="Name" required error={errors.name} description={eatery ? `Map link: /map?place=${eatery.slug} (kept when it’s renamed)` : undefined}>
          <Input name="name" defaultValue={eatery?.name} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Area" required error={errors.area}>
            <Select name="area" defaultValue={eatery?.area ?? null} options={areas.map((a) => ({ value: a.slug, label: a.title }))} placeholder="Pick an area" />
          </Field>
          <Switch name="dining_hall" defaultChecked={eatery?.dining_hall ?? false}>
            Dining hall
          </Switch>
        </div>
        <Field label="Address">
          <Input name="address" defaultValue={eatery?.address ?? ''} placeholder="55 Park Place NE" />
        </Field>
        <Field label="Description">
          <TextArea name="description" rows={3} defaultValue={eatery?.description ?? ''} />
        </Field>
        <Field label="Insider tip" error={errors.tip} description="Optional. A line of advice in a student’s voice, set apart on its card.">
          <Input name="tip" defaultValue={eatery?.tip ?? ''} maxLength={TIP_MAX} placeholder="The line is shortest before 11." />
        </Field>
        <Field label="Hours, in words" description="As an official source lists them. Shown on its card.">
          <Input name="hours" defaultValue={eatery?.hours ?? ''} placeholder="Mon–Fri 7 a.m.–9 p.m. Closed weekends." />
        </Field>
        <HoursEditor name="schedule" label="Hours, for “Open now”" initial={eatery?.schedule} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heads-up" description="A badge in place of “Open now”, like Closed for maintenance.">
            <Input name="status" defaultValue={eatery?.status ?? ''} />
          </Field>
          <Field label="Note" description="A small line at the bottom of its card.">
            <Input name="note" defaultValue={eatery?.note ?? ''} />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-[0.85rem] font-semibold text-ink">On the map</legend>
          <Field label="Paste a map link" description="From Google Maps or OpenStreetMap, to fill in its own pin below.">
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
          />
          {lat !== null || lng !== null ? (
            <Button
              size="sm"
              variant="ghost"
              className="self-start"
              onClick={() => {
                setLat(null)
                setLng(null)
              }}>
              Remove the pin (use “Inside” instead)
            </Button>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Latitude" error={errors.lat}>
              <NumberInput name="lat" value={lat} onValueChange={setLat} step={0.0001} stepper={false} />
            </Field>
            <Field label="Longitude">
              <NumberInput name="lng" value={lng} onValueChange={setLng} step={0.0001} stepper={false} />
            </Field>
          </div>
          <Field label="Inside" description="Without a pin of its own, “Show on map” opens this place (a dining hall uses its building’s, and lends it its hours).">
            <Select name="place_id" type="combobox" defaultValue={eatery?.place_id ?? null} options={PLACE_OPTIONS} placeholder="None" />
          </Field>
        </fieldset>

        <LocationsEditor initial={eatery?.locations ?? []} error={errors.locations} />

        <Field label="Last checked" description="When someone last confirmed it’s open, and its hours, against an official source.">
          <DatePicker name="checked_on" size="sm" defaultValue={eatery ? eatery.checked_on : atlantaToday()} max={atlantaToday()} />
        </Field>
        <Field label="Official site" error={errors.url}>
          <Input name="url" inputMode="url" defaultValue={eatery?.url ?? ''} placeholder="https://…" />
        </Field>
        <Field label="Search words" description="What people might search the map for: tacos, coffee, late night.">
          <TagInput name="aliases" defaultValue={eatery?.aliases ?? []} transform={(t) => t.toLowerCase()} />
        </Field>
        {/* Its place in its area; a new one goes last. Arrange changes it. */}
        <input type="hidden" name="sort" value={eatery?.sort ?? nextSort} />
        <Switch name="published" defaultChecked={eatery?.published ?? true} description="Hidden ones stay here for later.">
          Show on the site and map
        </Switch>
      </form>
    </Dialog>
  )
}

/** Older than this, a check is due (about a semester) */
const STALE_DAYS = 120
const isStale = (checkedOn: string) => (Date.parse(atlantaToday()) - Date.parse(checkedOn)) / 86_400_000 > STALE_DAYS
const checkedLabel = (checkedOn: string) => `${shortDate(checkedOn)}, ${checkedOn.slice(0, 4)}`

const pinOf = (e: EateryRow) =>
  e.locations.length
    ? `${e.locations.length} locations`
    : e.lat !== null
      ? 'Own pin'
      : e.place_id
        ? `In ${PLACES.find((p) => p.id === e.place_id)?.name ?? e.place_id}`
        : 'No pin'

export const EateriesView: FC<{ eateries: EateryRow[]; areas: EateryAreaRow[]; closures: EateryClosureRow[] }> = ({ eateries, areas, closures }) => {
  const router = useRouter()
  const { confirm, toast } = useNotify()
  const [editing, setEditing] = useState<EateryRow | 'new' | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const [tool, setTool] = useState<'areas' | 'arrange' | null>(null)
  const open = (e: EateryRow | 'new') => {
    setDialogKey((k) => k + 1)
    setEditing(e)
  }
  // In the page's order: by area as the page lists them, then each area's order
  const rows = useMemo(() => {
    const at = (slug: string) => areas.findIndex((a) => a.slug === slug)
    return [...eateries].sort((a, b) => at(a.area) - at(b.area) || a.sort - b.sort)
  }, [eateries, areas])
  const areaTitle = (slug: string) => areas.find((a) => a.slug === slug)?.title ?? slug
  const counts = Object.fromEntries(areas.map((a) => [a.slug, eateries.filter((e) => e.area === a.slug).length]))
  // Each eatery's closure today, if one covers it
  const today = atlantaToday()
  const closedNow = (slug: string) => closures.find((c) => c.starts_on <= today && today <= c.ends_on && c.eateries.includes(slug))
  const nextSort = Math.max(0, ...eateries.map((e) => e.sort)) + 10
  return (
    <>
      <PageTitle
        icon={<Utensils />}
        title="Eateries"
        description="Places to eat: the Places to Eat page’s lists, References on other pages, and the map’s Food pins, with “Open now” from the hours set here."
        actions={
          <>
            <Button href="/eat" size="sm" variant="outline" external>
              Open Places to Eat
            </Button>
            <Button size="sm" variant="outline" leading={<Layers size={15} aria-hidden />} onClick={() => setTool('areas')}>
              Areas
            </Button>
            <Button size="sm" variant="outline" leading={<ArrowDownUp size={15} aria-hidden />} disabled={!eateries.length} onClick={() => setTool('arrange')}>
              Arrange
            </Button>
            <Button size="sm" leading={<Plus size={15} aria-hidden />} onClick={() => open('new')}>
              Add an eatery
            </Button>
          </>
        }
      />
      <Table
        caption="Eateries"
        hideCaption
        rows={rows}
        getRowId={(e) => e.id}
        empty={
          <EmptyState
            size="sm"
            icon={<Utensils />}
            title="No eateries here yet"
            description="Until there are, the site shows its built-in list. Run npm run eateries:seed -- --write to copy that list here, or add them one by one."
            actions={
              <Button size="sm" onClick={() => open('new')}>
                Add an eatery
              </Button>
            }
          />
        }
        columns={[
          { key: 'name', header: 'Name', sortable: true, cell: (e) => <span className="flex min-w-0 flex-col">{e.name}{e.address ? <span className="text-[0.8rem] font-normal text-muted">{e.address}</span> : null}</span> },
          { key: 'area', header: 'Area', sortable: true, cell: (e) => areaTitle(e.area) },
          {
            key: 'schedule',
            header: 'Open now',
            hideWhenStacked: true,
            cell: (e) => {
              const closure = closedNow(e.slug)
              return closure ? (
                <Badge size="sm" tone="warning">
                  Closed for {closure.label} through {shortDate(closure.ends_on)}
                </Badge>
              ) : e.status ? (
                <Badge size="sm" tone="warning">
                  {e.status}
                </Badge>
              ) : e.schedule?.length || e.locations.some((l) => l.schedule?.length) ? (
                'Hours set'
              ) : (
                <span className="text-muted">No hours</span>
              )
            },
          },
          { key: 'lat', header: 'Map', hideWhenStacked: true, cell: pinOf },
          {
            key: 'checked_on',
            header: 'Checked',
            sortable: true,
            hideWhenStacked: true,
            cell: (e) =>
              !e.checked_on ? (
                <Badge size="sm" tone="warning">
                  Never
                </Badge>
              ) : isStale(e.checked_on) ? (
                <Badge size="sm" tone="warning">
                  {checkedLabel(e.checked_on)}
                </Badge>
              ) : (
                checkedLabel(e.checked_on)
              ),
          },
          {
            key: 'published',
            header: 'On the site',
            sortable: true,
            cell: (e) => (
              <Badge size="sm" dot tone={e.published ? 'success' : 'neutral'}>
                {e.published ? 'Shown' : 'Hidden'}
              </Badge>
            ),
          },
        ]}
        rowActions={(e) => (
          <ActionMenu
            label={`Actions for ${e.name}`}
            items={[
              { label: 'Edit', icon: <Pencil />, onSelect: () => open(e) },
              {
                label: 'Mark checked today',
                icon: <CalendarCheck />,
                onSelect: async () => {
                  const result = await markEateriesChecked([e.id])
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t save', message: result.error })
                  router.refresh()
                },
              },
              ...(e.published ? [{ label: 'View on the map', icon: <MapPin />, href: `/map?place=${e.lat !== null ? e.slug : (e.locations[0]?.id ?? e.place_id ?? e.slug)}` }] : []),
              'separator',
              {
                label: 'Delete',
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  if (!(await confirm({ title: `Delete ${e.name}?`, message: 'It comes off the site and the map right away.', variant: 'error', confirmLabel: 'Delete' }))) return
                  const result = await deleteEatery(e.id)
                  if (!result.ok) return toast({ variant: 'error', title: 'Couldn’t delete', message: result.error })
                  router.refresh()
                },
              },
            ]}
          />
        )}
      />
      <EateryDialog key={dialogKey} eatery={editing === 'new' ? null : editing} areas={areas} nextSort={nextSort} open={editing !== null} onClose={() => setEditing(null)} />
      <ClosuresPanel closures={closures} eateries={rows} areas={areas} />
      {/* Opened fresh each time, from what's saved now */}
      {tool === 'areas' ? (
        <GroupsDialog
          title="Areas"
          description="How Places to Eat groups its eateries, in the page’s order. Drag the grips to reorder. An area with eateries can’t be removed until they move."
          noun="area"
          items={['eatery', 'eateries']}
          groups={areas}
          counts={counts}
          save={saveAreas}
          onClose={() => setTool(null)}
        />
      ) : null}
      {tool === 'arrange' ? (
        <ArrangeDialog
          title="Arrange eateries"
          groupLabel="Area"
          groups={areas}
          items={eateries.map((e) => ({ id: e.id, name: e.name, group: e.area, sort: e.sort, badges: [...(e.dining_hall ? ['Dining hall'] : []), ...(e.published ? [] : ['Hidden'])] }))}
          note="Dining halls show first in their area on Places to Eat, whatever their place here."
          save={reorderEateries}
          onClose={() => setTool(null)}
        />
      ) : null}
    </>
  )
}
