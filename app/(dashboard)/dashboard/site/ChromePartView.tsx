'use client'

import { Menu, Moon, PanelBottom, PanelTop, Plus, Search, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FC, type ReactNode } from 'react'

import { Alert, Badge, Button, useNotify } from '@/components'
import { Field, Input, Select, Sortable, SortableHandle, Switch, TextArea } from '@/components/Form'
import type { NavItem, NavMenuLink } from '@/globals/config/nav'
import { inlineLink } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { saveSiteChrome } from '@/lib/dashboard/actions'
import { formatDate } from '@/lib/dashboard/format'
import type { HomeButton } from '@/lib/homepage'
import {
  BUILT_IN_CHROME,
  CHROME_LIMITS,
  CHROME_PARTS,
  chromePartFrom,
  footerBottomLinks,
  footerColumns,
  headerLinks,
  MENU_LOCATIONS,
  menuById,
  menuUses,
  siteChromeFrom,
  type ChromePart,
  type FooterContent,
  type HeaderContent,
  type NavigationContent,
  type NavMenu,
  type SearchContent,
  type SiteChrome,
} from '@/lib/siteChrome'
import type { SiteChromeRow } from '@/lib/supabase/types'

import { PageTitle, useAction } from '../ui'

type Errors = Record<string, string | undefined>

const ICONS: Record<ChromePart, ReactNode> = { navigation: <Menu />, search: <Search />, header: <PanelTop />, footer: <PanelBottom /> }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// ── Lists, kept in order ────────────────────────────────────────────────────

const replaceAt = <T,>(list: readonly T[], i: number, item: T): T[] => list.map((x, at) => (at === i ? item : x))
const removeAt = <T,>(list: readonly T[], i: number): T[] => list.filter((_, at) => at !== i)

/**
 * A key for each item of a list that has none of its own (a link is just its words and
 * where it goes), so it can be dragged: given the first time it's seen, and handed on to
 * the copy that replaces it when it's edited.
 */
const KEYS = new WeakMap<object, string>()
let lastKey = 0
const keyOf = (item: object) => {
  let key = KEYS.get(item)
  if (!key) {
    key = `item-${++lastKey}`
    KEYS.set(item, key)
  }
  return key
}
const keep = <T extends object>(from: object, to: T): T => {
  KEYS.set(to, keyOf(from))
  return to
}

const RemoveButton: FC<{ name: string; onClick: () => void }> = ({ name, onClick }) => (
  <Button size="sm" variant="ghost" aria-label={`Remove ${name}`} className="shrink-0" onClick={onClick}>
    <Trash2 size={15} aria-hidden />
  </Button>
)

const DRAG_HINT = 'Drag the grips to reorder, or focus one and press Space, then the arrow keys.'

const Card: FC<{ title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }> = ({ title, description, actions, children, className }) => (
  <section className={cn('flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5', className)}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="m-0 text-[1rem] font-bold text-ink">{title}</h2>
        {description ? <p className="m-0 text-[0.85rem] text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
    {children}
  </section>
)

/** A rough picture of how it'll look on the site, updating as the form changes */
const Preview: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <section aria-label={label} className="flex flex-col gap-2">
    <p className="m-0 text-[0.75rem] font-bold tracking-wide text-muted uppercase">Preview</p>
    <div className="overflow-x-auto rounded-xl border border-dashed border-line bg-fill p-4">{children}</div>
  </section>
)

/** A button's words and link, with a switch to have none */
const ButtonFields: FC<{ label: string; value: HomeButton | null; fallback: HomeButton; onChange: (b: HomeButton | null) => void; errors: Errors; at: string }> = ({ label, value, fallback, onChange, errors, at }) => (
  <div className="flex flex-col gap-3">
    <Switch checked={!!value} onCheckedChange={(on) => onChange(on ? (value ?? fallback) : null)}>
      {label}
    </Switch>
    {value ? (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Words" error={errors[`${at}.label`]}>
          <Input value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} />
        </Field>
        <Field label="Link" error={errors[`${at}.href`]}>
          <Input value={value.href} onChange={(e) => onChange({ ...value, href: e.target.value })} placeholder="/join" />
        </Field>
      </div>
    ) : null}
  </div>
)

const AddButton: FC<{ onClick: () => void; disabled?: boolean; children: ReactNode }> = ({ onClick, disabled, children }) => (
  <Button size="sm" variant="outline" className="self-start" leading={<Plus size={14} aria-hidden />} disabled={disabled} onClick={onClick}>
    {children}
  </Button>
)

/** Picks one of the site's menus for a location */
const MenuSelect: FC<{ label: string; value: string | null; onChange: (id: string | null) => void; menus: readonly NavMenu[]; none?: string; error?: string; taken?: readonly string[] }> = ({ label, value, onChange, menus, none, error, taken = [] }) => {
  const gone = !!value && !menus.some((m) => m.id === value)
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-sm">
      <Select
        aria-label={label}
        invalid={!!error}
        value={value ?? ''}
        onValueChange={(id) => onChange(id || null)}
        options={[
          ...(none ? [{ value: '', label: none }] : []),
          ...(gone ? [{ value: value, label: 'A menu that was removed' }] : []),
          ...menus.map((m) => ({
            value: m.id,
            label: m.name || 'Untitled menu',
            description: m.links.length === 1 ? '1 link' : `${m.links.length} links`,
            disabled: m.id !== value && taken.includes(m.id),
          })),
        ]}
      />
      {error ? <p className="m-0 text-[0.8rem] font-medium text-danger">{error}</p> : null}
    </div>
  )
}

const EditMenuLink: FC<{ id: string | null }> = ({ id }) =>
  id ? (
    <Link href={`/dashboard/site/navigation?menu=${encodeURIComponent(id)}`} className={cn(inlineLink, 'shrink-0 text-[0.85rem]')}>
      Edit this menu’s links
    </Link>
  ) : null

type PartProps<T> = { value: T; onChange: (value: T) => void; errors: Errors; chrome: SiteChrome }

// ── Navigation: the menus ───────────────────────────────────────────────────

/** One link of a menu: its words and where it goes, and the links under it */
const MenuLinkFields: FC<{ link: NavItem; onChange: (l: NavItem) => void; errors: Errors; at: string; handle: ReactNode; onRemove: () => void; name: string }> = ({ link, onChange, errors, at, handle, onRemove, name }) => {
  const sub = link.menu?.links ?? []
  const setSub = (links: NavMenuLink[]) => onChange({ ...link, menu: { description: link.menu?.description ?? '', links } })
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3">
      <div className="flex items-start gap-2">
        <span className="pt-6">{handle}</span>
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
          <Field label="Words" error={errors[`${at}.label`]}>
            <Input value={link.label} onChange={(e) => onChange({ ...link, label: e.target.value })} />
          </Field>
          <Field label="Link" error={errors[`${at}.href`]}>
            <Input value={link.href} onChange={(e) => onChange({ ...link, href: e.target.value })} placeholder="/about" />
          </Field>
        </div>
        <span className="pt-6">
          <RemoveButton name={name} onClick={onRemove} />
        </span>
      </div>
      <Switch size="sm" checked={!!link.menu} onCheckedChange={(on) => onChange(on ? { ...link, menu: { description: '', links: [{ href: link.href, label: link.label }] } } : { href: link.href, label: link.label })}>
        Links under {name}
      </Switch>
      {link.menu ? (
        <div className="ml-1 flex flex-col gap-3 border-l-2 border-line pl-4">
          <Field label="A line introducing them" description="Beside the links, in the header on wide screens." error={errors[`${at}.menu.description`]}>
            <Input value={link.menu.description} onChange={(e) => onChange({ ...link, menu: { description: e.target.value, links: sub } })} />
          </Field>
          {errors[`${at}.menu`] ? <Alert tone="danger">{errors[`${at}.menu`]}</Alert> : null}
          <Sortable
            aria-label={`Links under ${name}`}
            items={sub}
            onItemsChange={setSub}
            getKey={keyOf}
            getLabel={(l) => `${l.label || 'Untitled link'} under ${name}`}
            className="gap-3"
            renderItem={(l, { index: j, handleProps }) => {
              const setOne = (next: NavMenuLink) => setSub(replaceAt(sub, j, keep(l, next)))
              return (
                <div className="flex flex-col gap-3 rounded-lg bg-fill p-3">
                  <div className="flex items-start gap-2">
                    <span className="pt-6">
                      <SortableHandle {...handleProps} />
                    </span>
                    <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                      <Field label="Words" error={errors[`${at}.menu.links.${j}.label`]}>
                        <Input value={l.label} onChange={(e) => setOne({ ...l, label: e.target.value })} />
                      </Field>
                      <Field label="Link" error={errors[`${at}.menu.links.${j}.href`]}>
                        <Input value={l.href} onChange={(e) => setOne({ ...l, href: e.target.value })} placeholder="/about#faq" />
                      </Field>
                    </div>
                    <span className="pt-6">
                      <RemoveButton name={`${l.label || `link ${j + 1}`} under ${name}`} onClick={() => setSub(removeAt(sub, j))} />
                    </span>
                  </div>
                  <Field label="A line about it" error={errors[`${at}.menu.links.${j}.description`]}>
                    <Input value={l.description ?? ''} onChange={(e) => setOne({ href: l.href, label: l.label, ...(e.target.value ? { description: e.target.value } : {}) })} />
                  </Field>
                </div>
              )
            }}
          />
          <AddButton disabled={sub.length >= CHROME_LIMITS.subLinks} onClick={() => setSub([...sub, { href: '', label: '' }])}>
            Add a link under {name}
          </AddButton>
        </div>
      ) : null}
    </div>
  )
}

const NavigationFields: FC<PartProps<NavigationContent> & { initialMenu?: string }> = ({ value, onChange, errors, chrome, initialMenu }) => {
  const { confirm } = useNotify()
  const { menus } = value
  const [openId, setOpenId] = useState(() => (menus.some((m) => m.id === initialMenu) ? initialMenu! : menus[0]?.id))
  const at = Math.max(0, menus.findIndex((m) => m.id === openId))
  const menu = menus[at]
  const setMenus = (next: NavMenu[]) => onChange({ menus: next })
  const setMenu = (next: NavMenu) => setMenus(replaceAt(menus, at, next))
  const key = `menus.${at}`
  // A problem in a menu that isn't open would otherwise go unseen
  const withProblems = new Set(Object.keys(errors).flatMap((k) => (errors[k] && k.startsWith('menus.') ? [Number(k.split('.')[1])] : [])))

  const add = () => {
    let id = `menu-${Date.now().toString(36)}`
    while (menus.some((m) => m.id === id)) id += 'x'
    setMenus([...menus, { id, name: 'New menu', links: [{ href: '', label: '' }] }])
    setOpenId(id)
  }

  const remove = async () => {
    const uses = menuUses(chrome, menu.id)
    const ok = await confirm({
      title: `Remove “${menu.name || 'this menu'}”?`,
      message: uses.length ? `It’s shown in ${uses.join(' and ')}, which will go without it once you save.` : 'It isn’t shown anywhere on the site. Nothing changes until you save.',
      confirmLabel: 'Remove it',
    })
    if (!ok) return
    const next = removeAt(menus, at)
    setMenus(next)
    setOpenId(next[Math.max(0, at - 1)]?.id)
  }

  return (
    <div className="flex flex-col gap-4">
      {errors.menus ? <Alert tone="danger">{errors.menus}</Alert> : null}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Menus">
        {menus.map((m, i) => (
          <Button key={m.id} size="sm" variant={m.id === menu?.id ? undefined : 'outline'} aria-pressed={m.id === menu?.id} onClick={() => setOpenId(m.id)}>
            {m.name || 'Untitled menu'}
            {withProblems.has(i) ? ' (needs a look)' : ''}
          </Button>
        ))}
        <Button size="sm" variant="ghost" leading={<Plus size={14} aria-hidden />} disabled={menus.length >= CHROME_LIMITS.menus} onClick={add}>
          New menu
        </Button>
      </div>

      {menu ? (
        <Card
          title={menu.name || 'Untitled menu'}
          description={
            menuUses(chrome, menu.id).length ? (
              <span className="flex flex-wrap items-center gap-1.5">
                Shown in
                {menuUses(chrome, menu.id).map((u) => (
                  <Badge key={u} size="sm">
                    {u}
                  </Badge>
                ))}
              </span>
            ) : (
              <>
                Not on the site yet. Give it a place in the{' '}
                <Link href="/dashboard/site/header" className={inlineLink}>
                  Header
                </Link>{' '}
                or{' '}
                <Link href="/dashboard/site/footer" className={inlineLink}>
                  Footer
                </Link>
                .
              </>
            )
          }
          actions={
            <Button size="sm" variant="ghost" leading={<Trash2 size={14} aria-hidden />} disabled={menus.length <= 1} onClick={remove}>
              Remove menu
            </Button>
          }
        >
          {errors[key] ? <Alert tone="danger">{errors[key]}</Alert> : null}
          <Field label="Menu name" description="What it’s called here, and its heading where it’s a footer column." error={errors[`${key}.name`]} className="sm:max-w-xs">
            <Input value={menu.name} onChange={(e) => setMenu({ ...menu, name: e.target.value })} />
          </Field>
          {errors[`${key}.links`] ? <Alert tone="danger">{errors[`${key}.links`]}</Alert> : null}
          {menu.links.length ? (
            <>
              <p className="m-0 text-[0.85rem] text-muted">{DRAG_HINT}</p>
              <Sortable
                aria-label={`Links in ${menu.name || 'this menu'}`}
                items={menu.links}
                onItemsChange={(links) => setMenu({ ...menu, links })}
                getKey={keyOf}
                getLabel={(l) => l.label || 'Untitled link'}
                className="gap-3"
                renderItem={(link, { index: i, handleProps }) => (
                  <MenuLinkFields
                    link={link}
                    name={link.label || `link ${i + 1}`}
                    onChange={(next) => setMenu({ ...menu, links: replaceAt(menu.links, i, keep(link, next)) })}
                    onRemove={() => setMenu({ ...menu, links: removeAt(menu.links, i) })}
                    errors={errors}
                    at={`${key}.links.${i}`}
                    handle={<SortableHandle {...handleProps} />}
                  />
                )}
              />
            </>
          ) : (
            <p className="m-0 text-[0.9rem] text-muted">No links yet.</p>
          )}
          <AddButton disabled={menu.links.length >= CHROME_LIMITS.links} onClick={() => setMenu({ ...menu, links: [...menu.links, { href: '', label: '' }] })}>
            Add a link
          </AddButton>
        </Card>
      ) : null}
    </div>
  )
}

// ── Header ──────────────────────────────────────────────────────────────────

const HeaderFields: FC<PartProps<HeaderContent>> = ({ value, onChange, errors, chrome }) => {
  const { menus } = chrome.navigation
  const links = headerLinks({ navigation: chrome.navigation, header: value }).filter((l) => l.href !== value.cta?.href)
  return (
    <div className="flex flex-col gap-4">
      <Preview label="Header preview">
        <div className="flex min-w-max items-center gap-5 rounded-lg bg-surface px-4 py-2.5 text-[0.85rem] shadow-card">
          <span className="font-bold text-ink">CSEG</span>
          <span className="ml-auto flex items-center gap-4 pl-6 font-semibold text-ink-soft">
            {links.map((l, i) => (
              <span key={i}>
                {l.label || '…'}
                {l.menu ? ' ▾' : ''}
              </span>
            ))}
          </span>
          <span className="flex items-center gap-3 text-ink-soft">
            {value.search ? <Search size={16} aria-label="Search button" /> : null}
            {value.themeToggle ? <Moon size={16} aria-label="Light and dark switch" /> : null}
            {value.cta ? <span className="rounded-md bg-brand-solid px-3 py-1 font-semibold text-white">{value.cta.label || '…'}</span> : null}
          </span>
        </div>
      </Preview>

      <Card title={`Menu location: ${MENU_LOCATIONS['header.menu'].name}`} description={MENU_LOCATIONS['header.menu'].holds}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <MenuSelect label={MENU_LOCATIONS['header.menu'].name} value={value.menu} onChange={(id) => id && onChange({ ...value, menu: id })} menus={menus} error={errors.menu} />
          <EditMenuLink id={menuById(chrome.navigation, value.menu)?.id ?? null} />
        </div>
      </Card>

      <Card title="Beside the menu">
        <Switch checked={value.search} onCheckedChange={(search) => onChange({ ...value, search })}>
          Search button
        </Switch>
        <Switch checked={value.themeToggle} onCheckedChange={(themeToggle) => onChange({ ...value, themeToggle })}>
          Light and dark switch
        </Switch>
        <ButtonFields label="A button after the menu" value={value.cta} fallback={BUILT_IN_CHROME.header.cta ?? { label: '', href: '' }} onChange={(cta) => onChange({ ...value, cta })} errors={errors} at="cta" />
        <p className="m-0 text-[0.85rem] text-muted">A menu link going to the same place as the button is left out of the menu on wide screens, so it isn’t there twice.</p>
      </Card>
    </div>
  )
}

// ── Footer ──────────────────────────────────────────────────────────────────

const FooterFields: FC<PartProps<FooterContent>> = ({ value, onChange, errors, chrome }) => {
  const { menus } = chrome.navigation
  const { cta, columns } = value
  const now = { navigation: chrome.navigation, footer: value }
  const setCta = (patch: Partial<FooterContent['cta']>) => onChange({ ...value, cta: { ...cta, ...patch } })
  const setColumns = (next: string[]) => onChange({ ...value, columns: next })
  const free = menus.filter((m) => !columns.includes(m.id))
  const shown = footerColumns(now)
  const bottom = footerBottomLinks(now)
  return (
    <div className="flex flex-col gap-4">
      <Preview label="Footer preview">
        <div className="flex min-w-max flex-col gap-4 rounded-lg bg-surface p-4 text-[0.8rem] shadow-card">
          {cta.shown ? (
            <div className="flex items-center justify-between gap-6 rounded-md border border-line px-3 py-2">
              <span className="font-bold text-ink">{cta.title || '…'}</span>
              {cta.button ? <span className="rounded-md bg-brand-solid px-2.5 py-1 font-semibold text-white">{cta.button.label || '…'}</span> : null}
            </div>
          ) : null}
          <div className="flex gap-8">
            {shown.length ? (
              shown.map((s, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-[0.7rem] font-bold tracking-wide text-ink-faint uppercase">{s.title || '…'}</span>
                  {s.links.map((l, j) => (
                    <span key={j} className="text-muted">
                      {l.label || '…'}
                    </span>
                  ))}
                </div>
              ))
            ) : (
              <span className="text-muted">No link columns.</span>
            )}
          </div>
          <div className="flex gap-4 border-t border-line pt-2 text-muted">
            <span>© CSEG</span>
            {bottom.map((l, i) => (
              <span key={i} className="text-ink">
                {l.label || '…'}
              </span>
            ))}
          </div>
        </div>
      </Preview>

      <Card title={`Menu location: ${MENU_LOCATIONS['footer.columns'].name}`} description={`${MENU_LOCATIONS['footer.columns'].holds} Pages listed in the footer from Pages follow them, under More.`}>
        {errors.columns ? <Alert tone="danger">{errors.columns}</Alert> : null}
        {columns.length ? (
          <>
            <p className="m-0 text-[0.85rem] text-muted">{DRAG_HINT}</p>
            <Sortable
              aria-label="Footer columns, in order"
              items={columns}
              onItemsChange={setColumns}
              getKey={(id) => id}
              getLabel={(id) => `the ${menuById(chrome.navigation, id)?.name || 'removed menu'} column`}
              renderItem={(id, { index: i, handleProps }) => (
                <div className="flex flex-wrap items-start gap-x-3 gap-y-2 rounded-lg border border-line bg-surface p-3">
                  <span className="flex h-10 items-center gap-2">
                    <SortableHandle {...handleProps} />
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-fill text-[0.85rem] font-bold text-ink-soft" aria-hidden>
                      {i + 1}
                    </span>
                  </span>
                  <MenuSelect label={`Column ${i + 1}`} value={id} onChange={(next) => next && setColumns(replaceAt(columns, i, next))} menus={menus} taken={columns} error={errors[`columns.${i}`]} />
                  <span className="flex h-10 items-center">
                    <EditMenuLink id={menuById(chrome.navigation, id)?.id ?? null} />
                  </span>
                  <span className="ml-auto flex h-10 items-center">
                    <RemoveButton name={`the ${menuById(chrome.navigation, id)?.name || `column ${i + 1}`} column`} onClick={() => setColumns(removeAt(columns, i))} />
                  </span>
                </div>
              )}
            />
          </>
        ) : (
          <p className="m-0 text-[0.9rem] text-muted">No columns: the footer shows no links of its own.</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <AddButton disabled={!free.length || columns.length >= CHROME_LIMITS.footerColumns} onClick={() => setColumns([...columns, free[0].id])}>
            Add a column
          </AddButton>
          {!free.length ? (
            <span className="text-[0.85rem] text-muted">
              Every menu is a column already.{' '}
              <Link href="/dashboard/site/navigation" className={inlineLink}>
                Make another menu
              </Link>
            </span>
          ) : null}
        </div>
      </Card>

      <Card title={`Menu location: ${MENU_LOCATIONS['footer.bottom'].name}`} description={MENU_LOCATIONS['footer.bottom'].holds}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <MenuSelect label={MENU_LOCATIONS['footer.bottom'].name} value={value.bottom} onChange={(bottom) => onChange({ ...value, bottom })} menus={menus} none="No menu" error={errors.bottom} />
          <EditMenuLink id={menuById(chrome.navigation, value.bottom)?.id ?? null} />
        </div>
      </Card>

      <Card
        title="Card above the links"
        actions={
          <Switch size="sm" checked={cta.shown} onCheckedChange={(on) => setCta({ shown: on })}>
            Show
          </Switch>
        }
      >
        <div className={cn('flex flex-col gap-4', !cta.shown && 'opacity-60')}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <Field label="Above the title" error={errors['cta.eyebrow']}>
              <Input value={cta.eyebrow} onChange={(e) => setCta({ eyebrow: e.target.value })} />
            </Field>
            <Field label="Title" error={errors['cta.title']}>
              <Input value={cta.title} onChange={(e) => setCta({ title: e.target.value })} />
            </Field>
          </div>
          <Field label="Under the title" error={errors['cta.text']}>
            <TextArea rows={2} value={cta.text} onChange={(e) => setCta({ text: e.target.value })} />
          </Field>
          <ButtonFields label="A button" value={cta.button} fallback={BUILT_IN_CHROME.footer.cta.button ?? { label: '', href: '' }} onChange={(button) => setCta({ button })} errors={errors} at="cta.button" />
        </div>
      </Card>
    </div>
  )
}

// ── Search ──────────────────────────────────────────────────────────────────

const SearchFields: FC<PartProps<SearchContent>> = ({ value, onChange, errors }) => {
  const set = (patch: Partial<SearchContent>) => onChange({ ...value, ...patch })
  // Each suggestion in a row of its own, so it has something to be dragged by (the form
  // remounts when the words are put back, so the rows always start from what's shown)
  const [rows, setRowsState] = useState(() => value.suggestions.map((text) => ({ text })))
  const setRows = (next: { text: string }[]) => {
    setRowsState(next)
    set({ suggestions: next.map((r) => r.text) })
  }
  return (
    <div className="flex flex-col gap-4">
      <Card title="The search page" description="What the search button in the header opens.">
        <Field label="Title" error={errors.title}>
          <Input value={value.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Under the title" error={errors.lead}>
          <Input value={value.lead} onChange={(e) => set({ lead: e.target.value })} />
        </Field>
        <Field label="In the empty search box" error={errors.placeholder}>
          <Input value={value.placeholder} onChange={(e) => set({ placeholder: e.target.value })} />
        </Field>
      </Card>
      <Card title="When nothing’s found">
        <Field label="Title" error={errors.emptyTitle}>
          <Input value={value.emptyTitle} onChange={(e) => set({ emptyTitle: e.target.value })} />
        </Field>
        <Field label="Under the title" error={errors.emptyText}>
          <Input value={value.emptyText} onChange={(e) => set({ emptyText: e.target.value })} />
        </Field>
      </Card>
      <Card title="Suggested searches" description="Offered under the search box before anything’s typed. Leave empty for none.">
        {errors.suggestions ? <Alert tone="danger">{errors.suggestions}</Alert> : null}
        <Sortable
          aria-label="Suggested searches, in order"
          items={rows}
          onItemsChange={setRows}
          getKey={keyOf}
          getLabel={(r) => r.text || 'an empty suggestion'}
          renderItem={(r, { index: i, handleProps }) => (
            <div className="flex items-start gap-2">
              <span className="pt-6">
                <SortableHandle {...handleProps} />
              </span>
              <Field label={`Suggestion ${i + 1}`} error={errors[`suggestions.${i}`]} className="min-w-0 flex-1">
                <Input value={r.text} onChange={(e) => setRows(replaceAt(rows, i, keep(r, { text: e.target.value })))} placeholder="financial aid" />
              </Field>
              <span className="pt-6">
                <RemoveButton name={r.text || `suggestion ${i + 1}`} onClick={() => setRows(removeAt(rows, i))} />
              </span>
            </div>
          )}
        />
        <AddButton disabled={rows.length >= CHROME_LIMITS.suggestions} onClick={() => setRows([...rows, { text: '' }])}>
          Add a suggestion
        </AddButton>
      </Card>
    </div>
  )
}

/**
 * One part of what frames every page of the site, on its own screen: the menus
 * (Navigation), the Search page's words, or the Header or Footer, which each pick the menus
 * that go in their places.
 */
export const ChromePartView: FC<{ part: ChromePart; row: SiteChromeRow | null; initialMenu?: string }> = ({ part, row, initialMenu }) => {
  const router = useRouter()
  const { confirm } = useNotify()
  const { pending, errors, run } = useAction()
  const [chrome] = useState<SiteChrome>(() => siteChromeFrom(row))
  const [saved, setSaved] = useState(chrome[part])
  const [content, setContent] = useState(saved)
  // Bumped when the form is put back (undo, the built-in copy), so it starts over from that
  const [version, setVersion] = useState(0)
  const reset = (to: typeof content) => {
    setContent(to)
    setVersion((v) => v + 1)
  }
  const { name, holds } = CHROME_PARTS[part]
  const lower = name.toLowerCase()

  if (!row)
    return (
      <>
        <PageTitle icon={ICONS[part]} title={name} />
        <Alert tone="warning" title="The site chrome table isn’t set up yet">
          Run the site chrome migration (npx supabase db push), then reload. The site shows its built-in menus, header, footer, and search page until then.
        </Alert>
      </>
    )

  const changed = !same(content, saved)
  // This part as it was before its last save: the way back from a save that went wrong
  const before = typeof row.previous === 'object' && row.previous !== null ? (row.previous as Record<string, unknown>)[part] : undefined
  const previous = before === undefined ? null : chromePartFrom(part, before)
  const isBuiltIn = same(content, BUILT_IN_CHROME[part])
  // What the page shows of the other parts, with this one as it's being edited
  const now = { ...chrome, [part]: content } as SiteChrome

  const save = () =>
    run(
      () => {
        const form = new FormData()
        form.set('part', part)
        form.set('content', JSON.stringify(content))
        return saveSiteChrome(form)
      },
      () => {
        setSaved(content)
        router.refresh()
      }
    )

  const fields = (): ReactNode => {
    switch (part) {
      case 'navigation':
        return <NavigationFields value={content as NavigationContent} onChange={setContent} errors={errors} chrome={now} initialMenu={initialMenu} />
      case 'header':
        return <HeaderFields value={content as HeaderContent} onChange={setContent} errors={errors} chrome={now} />
      case 'footer':
        return <FooterFields value={content as FooterContent} onChange={setContent} errors={errors} chrome={now} />
      case 'search':
        return <SearchFields value={content as SearchContent} onChange={setContent} errors={errors} chrome={now} />
    }
  }

  return (
    <>
      <PageTitle
        icon={ICONS[part]}
        title={name}
        description={`${holds} Saving puts it on the site right away, and the version before is kept in case you want it back.`}
        actions={
          <Button href={part === 'search' ? '/search' : '/'} size="sm" variant="outline" external>
            {part === 'search' ? 'Open the search page' : 'Open the site'}
          </Button>
        }
      />
      <div key={version} className="flex flex-col gap-4 pb-24">
        {errors.content ? <Alert tone="danger">{errors.content}</Alert> : null}
        {fields()}
      </div>

      {/* Stays in reach while scrolling the long form */}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-6 flex flex-wrap items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <Button size="sm" loading={pending} disabled={!changed} onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="outline" disabled={!changed} onClick={() => reset(saved)}>
          Undo changes
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!previous || same(content, previous)}
          title={previous ? `The ${lower} as it was before the last save` : 'Kept from the next save on'}
          onClick={() => previous && reset(previous)}
        >
          Bring back the previous version
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isBuiltIn}
          onClick={async () => {
            if (await confirm({ title: `Use the built-in ${lower}?`, message: 'It goes back to the site’s original. Nothing changes on the site until you save.', confirmLabel: 'Use it' })) reset(BUILT_IN_CHROME[part])
          }}
        >
          Use the built-in {lower}
        </Button>
        <span className="ml-auto text-[0.8rem] text-muted">
          {changed ? 'Unsaved changes' : row.updated_by ? `Last changed by ${row.updated_by.split('@')[0]}, ${formatDate(row.updated_at)}` : isBuiltIn ? 'Showing the built-in copy' : ''}
        </span>
      </div>
    </>
  )
}
