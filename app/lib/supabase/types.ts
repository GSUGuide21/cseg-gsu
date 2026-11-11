/**
 * The database's shape, matching supabase/migrations. Kept by hand; after changing the
 * schema, regenerate with `npx supabase gen types typescript --linked` and compare.
 */

/** An editor writes the site and never sees people's details; an admin also manages officers and settings */
export type OfficerRole = 'editor' | 'officer' | 'admin'
export type MemberStatus = 'active' | 'new' | 'inactive'
export type PublishStatus = 'draft' | 'published'
export type MemberYear = 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate'

export type OfficerRow = {
  email: string
  name: string | null
  title: string | null
  role: OfficerRole
  created_at: string
}

export type MemberRow = {
  id: string
  name: string
  email: string | null
  major: string | null
  year: MemberYear | null
  status: MemberStatus
  joined_on: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type CheckinRow = {
  id: string
  event_id: string
  /** Null on check-ins from before names were kept */
  event_name: string | null
  member_id: string | null
  name: string
  email: string | null
  checked_in_at: string
  checked_in_by: string | null
}

/** How posts are grouped on /posts */
export const POST_CATEGORIES = [
  { value: 'announcements', label: 'Announcements' },
  { value: 'events', label: 'Events' },
  { value: 'recaps', label: 'Recaps' },
  { value: 'resources', label: 'Resources' },
] as const

/** "Recaps" from "recaps"; null for no category, or one no longer listed */
export const postCategoryLabel = (category: string | null | undefined) => POST_CATEGORIES.find((c) => c.value === category)?.label ?? null

export type PostRow = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string
  cover_image_url: string | null
  status: PublishStatus
  published_at: string | null
  /** Published, it shows from here (null: right away) until unpublish_at (null: for good) */
  publish_at: string | null
  unpublish_at: string | null
  category: string | null
  /** Pinned to the top of /posts */
  featured: boolean
  author_email: string | null
  /** How readers see the author; the officer list isn't public */
  author_name: string | null
  /** A draft marked ready for another officer, and what they should look at */
  review_requested: boolean
  review_note: string | null
  created_at: string
  updated_at: string
}

/** One piece of writing, or split into titled sections */
export type PageLayout = 'document' | 'sections'

/** The most a page's subtitle (or a section's) can be */
export const PAGE_SUBTITLE_MAX = 300
/** The small label above a page's title (the database checks the same) */
export const PAGE_EYEBROW_MAX = 40
/** The most sections a page can have, and the longest a section's title can be */
export const PAGE_SECTIONS_MAX = 20
export const SECTION_TITLE_MAX = 120

/** One of a page's sections: its own title, subtitle, and writing (editor JSON, as body is) */
export type PageSection = {
  /** Stable while editing (the editor for each section is kept by it), and saved with it */
  id: string
  title: string
  subtitle: string
  /** Its #link (/about#faq); "" makes one from the title */
  anchor: string
  body: string
}

export type PageRow = {
  id: string
  slug: string
  title: string
  description: string | null
  /** The line under the title; null shows the description there */
  subtitle: string | null
  layout: PageLayout
  /** In the 'sections' layout, what the page shows (body is the 'document' layout's) */
  sections: PageSection[]
  body: string
  status: PublishStatus
  /** The small label above the title; null shows the site's own */
  eyebrow: string | null
  /** What link previews show; null for none */
  share_image_url: string | null
  /** In the sections layout, an "On this page" list under the title */
  show_toc: boolean
  /** An "Updated <date>" line under the title */
  show_updated: boolean
  /** Published, it shows from here (null: right away) until unpublish_at (null: for good) */
  publish_at: string | null
  unpublish_at: string | null
  review_requested: boolean
  review_note: string | null
  /** The page it sits under (/parent/this); null at the top */
  parent_id: string | null
  /** Where the site's menu lists it */
  nav_placement: NavPlacement
  /** What the menu calls it; null uses its title */
  nav_label: string | null
  nav_sort: number
  updated_by: string | null
  created_at: string
  updated_at: string
}

/** Where a page is listed in the site's menu: the header's More menu, the footer, both, or neither */
export type NavPlacement = 'none' | 'header' | 'footer' | 'both'

/** Which campus guide a collection of picks is featured on (and so what's in it) */
export type GuideKind = 'map' | 'eat' | 'resources'

/** An officer's collection of places, eateries, or resources ("First-week essentials") */
export type GuidePickRow = {
  id: string
  guide: GuideKind
  title: string
  description: string | null
  /** One of the site's card icons, by name */
  icon: string
  /** Place ids, eatery slugs, or resource slugs, in order */
  items: string[]
  sort: number
  published: boolean
  created_at: string
  updated_at: string
}

/** A page's old web address, forwarding to it */
export type PageRedirectRow = {
  from_slug: string
  page_id: string
  created_at: string
}

export type MapPlaceRow = {
  id: string
  /** A built-in place's map id (student-center-east); null for the club's own pins */
  slug: string | null
  name: string
  category: string
  lat: number
  lng: number
  address: string | null
  description: string
  /** Extra search terms */
  aliases: string[]
  /** Other categories it's listed under */
  also_in: string[]
  /** A short tip in a student's voice; null for none */
  tip: string | null
  published: boolean
  created_at: string
  updated_at: string
}

/** A saved version of a page or post: its columns as saved, less id and timestamps */
export type RevisionRow<Doc> = {
  id: string
  snapshot: Partial<Omit<Doc, 'id' | 'created_at' | 'updated_at'>>
  saved_by: string | null
  saved_at: string
}
export type PageRevisionRow = RevisionRow<PageRow> & { page_id: string }
export type PostRevisionRow = RevisionRow<PostRow> & { post_id: string }

/** A weekly hours range, as saved: days 0 (Sunday) to 6, times "HH:mm" */
export type HoursRangeJson = { days: number[]; open: string; close: string }

export type EateryRow = {
  id: string
  /** Its map pin id and #link */
  slug: string
  name: string
  area: string
  dining_hall: boolean
  address: string
  description: string
  hours: string | null
  schedule: HoursRangeJson[] | null
  status: string | null
  note: string | null
  lat: number | null
  lng: number | null
  locations: { id: string; label: string; lat: number; lng: number; schedule?: HoursRangeJson[] | null }[]
  place_id: string | null
  url: string | null
  aliases: string[]
  sort: number
  published: boolean
  /** When an officer last confirmed its details, "YYYY-MM-DD"; null if never */
  checked_on: string | null
  /** A short tip in a student's voice; null for none */
  tip: string | null
  created_at: string
  updated_at: string
}

export type EateryAreaRow = {
  /** Its #link, and what References point at; kept when it's renamed */
  slug: string
  title: string
  description: string | null
  sort: number
  created_at: string
  updated_at: string
}

export type EateryClosureRow = {
  id: string
  label: string
  /** "YYYY-MM-DD", Atlanta dates, both days included */
  starts_on: string
  ends_on: string
  /** The eateries it closes, by slug */
  eateries: string[]
  created_at: string
  updated_at: string
}

export type ResourceGroupRow = {
  /** Its #link (/resources#money), and what References point at; kept when it's renamed */
  slug: string
  title: string
  description: string | null
  /** One of the card icons, or "" */
  icon: string
  sort: number
  created_at: string
  updated_at: string
}

export type ResourceRow = {
  id: string
  /** What References point at; kept when it's renamed */
  slug: string
  group_slug: string
  label: string
  href: string
  description: string
  /** The map place it's in, for "Show on map" */
  place_id: string | null
  /** A short tip in a student's voice; null for none */
  tip: string | null
  sort: number
  published: boolean
  created_at: string
  updated_at: string
}

/** One of CSEG's own events (PIN's come from PIN) */
export type ClubEventRow = {
  /** The event's id, as check-ins keep it; made from its name and date and kept */
  slug: string
  name: string
  starts_at: string
  ends_at: string
  location: string | null
  description: string
  /** Its PIN page, if it has one */
  href: string | null
  image_url: string | null
  /** What the picture says, for screen readers */
  image_alt: string | null
  status: EventStatus
  tags: string[]
  /** Where to join it online */
  online_url: string | null
  /** Every time and place it meets, when there's more than one (starts_at to ends_at spans them) */
  sessions: EventSession[]
  published: boolean
  created_at: string
  updated_at: string
}

/** Whether an event is still on; whether it's happening now or over comes from its times */
export type EventStatus = 'scheduled' | 'cancelled'

/** One time (and place) an event meets */
export type EventSession = { start: string; end: string; location?: string | null }

/** When an executive served: a year to a year, or on to now */
export type ServiceSpan = { startYear: number; endYear?: number | null }

export type ExecutiveRow = {
  id: string
  first_name: string
  last_name: string
  role: string
  bio: string
  is_founder: boolean
  avatar_url: string | null
  service: ServiceSpan[]
  /** What they share on the page: email, phone, and profile links */
  contact: Partial<Record<'email' | 'phone' | 'linkedIn' | 'twitter' | 'instagram' | 'facebook' | 'youtube' | 'website', string>>
  published: boolean
  created_at: string
  updated_at: string
}

export type AffiliateRow = {
  id: string
  slug: string
  name: string
  short_name: string
  wordmark_top: string
  wordmark_bottom: string
  summary: string | null
  /** Its paragraphs, a blank line between each */
  description: string
  /** Without the @ */
  instagram: string
  pin_key: string | null
  /** An https:// upload, or a path under public/ */
  logo_url: string | null
  discord_url: string | null
  sort: number
  published: boolean
  created_at: string
  updated_at: string
}

export type ConnectionKind = 'skybridge' | 'indoor' | 'shortcut'

/** A skybridge, indoor link, or shortcut for the map's route finder (app/lib/wayfinding.ts's Connection) */
export type MapConnectionRow = {
  id: string
  slug: string
  name: string
  kind: ConnectionKind
  note: string
  /** [[lat, lng], …] */
  path: [number, number][]
  in_osm: boolean
  half_width: number | null
  favor: number | null
  /** The place ids at each end, or none */
  ends: string[]
  stairs: boolean
  penalty: number | null
  sort: number
  published: boolean
  created_at: string
  updated_at: string
}

/** A message sent from the Contact page */
export type ContactMessageRow = {
  id: string
  name: string
  email: string
  subject: string | null
  body: string
  read_at: string | null
  read_by: string | null
  created_at: string
}

/** How a notice across the site is colored */
export type BannerTone = 'info' | 'success' | 'warning'

export type ClubSettingsRow = {
  id: number
  tagline: string | null
  meeting_info: string | null
  contact_email: string | null
  instagram_url: string | null
  /** The other places the club is online; null keeps the site's own (or leaves it out) */
  x_url: string | null
  pin_url: string | null
  groupme_url: string | null
  linktree_url: string | null
  discord_url: string | null
  linkedin_url: string | null
  youtube_url: string | null
  /** A notice across the site, shown through banner_until ("YYYY-MM-DD", Atlanta) or until cleared */
  banner_message: string | null
  banner_href: string | null
  banner_tone: BannerTone
  banner_until: string | null
  /** Off: /join says so, and takes no requests */
  accepting_members: boolean
  /** What a term's dues cost, in dollars; null for none set */
  dues_amount: number | null
  contact_form_open: boolean
  /** What the Contact form says once a message is sent; null for the site's own */
  contact_reply: string | null
  /** What search and link previews say about the site, and show, when a page has none of its own */
  site_description: string | null
  share_image_url: string | null
  /** Whether people who aren't members can be checked in, and whether one with an email becomes a member */
  walkins_allowed: boolean
  walkins_become_members: boolean
  updated_at: string
  updated_by: string | null
}

/** A semester, by its dates ("YYYY-MM-DD", both days included) */
export type TermRow = {
  id: string
  name: string
  starts_on: string
  ends_on: string
  created_at: string
  updated_at: string
}

export type DuesMethod = 'cash' | 'card' | 'transfer' | 'waived' | 'other'

/** A member's dues for one term */
export type DuesPaymentRow = {
  id: string
  member_id: string
  term_id: string
  amount: number
  paid_on: string
  method: DuesMethod
  note: string | null
  recorded_by: string | null
  created_at: string
  updated_at: string
}

export type JoinRequestStatus = 'pending' | 'approved' | 'declined'

/** Someone asking to join, from the Join page */
export type JoinRequestRow = {
  id: string
  name: string
  email: string
  major: string | null
  year: MemberYear | null
  message: string | null
  status: JoinRequestStatus
  /** Who they became, once approved */
  member_id: string | null
  handled_at: string | null
  handled_by: string | null
  created_at: string
}

/** Someone saying they'll come to one of the club's own events */
export type EventRsvpRow = {
  id: string
  event_id: string
  name: string
  email: string
  created_at: string
}

/** One of /about's common questions */
export type FaqRow = {
  id: string
  question: string
  answer: string
  sort: number
  published: boolean
  created_at: string
  updated_at: string
}

/** An old address on the site, and where it goes now */
export type RedirectRow = {
  id: string
  from_path: string
  to_path: string
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type MeetingMinutesRow = {
  id: string
  held_on: string
  title: string
  attendees: string[]
  notes: string
  file_url: string | null
  recorded_by: string | null
  created_at: string
  updated_at: string
}

export type SponsorTier = 'presenting' | 'partner' | 'supporter'

export type SponsorRow = {
  id: string
  name: string
  href: string | null
  logo_url: string | null
  tier: SponsorTier
  blurb: string | null
  /** Shown from starts_on through ends_on; null for no limit */
  starts_on: string | null
  ends_on: string | null
  sort: number
  published: boolean
  created_at: string
  updated_at: string
}

/** The homepage's words (one row); content is app/lib/homepage.ts's HomepageContent, or {} */
export type HomepageRow = {
  id: number
  content: unknown
  updated_at: string
  updated_by: string | null
}

/** A built-in page's tab title and search description; null keeps the site's own */
export type PageMetaRow = {
  path: string
  title: string | null
  description: string | null
  updated_at: string
  updated_by: string | null
}

export type ActivityRow = {
  id: number
  actor_email: string
  action: string
  subject: string | null
  created_at: string
}

/** Columns the database fills in itself, so inserts may leave them out */
type Generated = 'id' | 'created_at' | 'updated_at'
type Table<Row, Optional extends keyof Row = never> = {
  Row: Row
  Insert: Omit<Row, Optional | Extract<Generated, keyof Row>> & Partial<Pick<Row, Optional | Extract<Generated, keyof Row>>>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      officers: Table<OfficerRow, 'name' | 'title' | 'role'>
      members: Table<MemberRow, 'email' | 'major' | 'year' | 'status' | 'joined_on' | 'notes'>
      event_checkins: Table<CheckinRow, 'event_name' | 'member_id' | 'email' | 'checked_in_at' | 'checked_in_by'>
      posts: Table<PostRow, 'excerpt' | 'body' | 'cover_image_url' | 'status' | 'published_at' | 'publish_at' | 'unpublish_at' | 'category' | 'featured' | 'author_email' | 'author_name' | 'review_requested' | 'review_note'>
      pages: Table<PageRow, 'description' | 'subtitle' | 'layout' | 'sections' | 'body' | 'status' | 'eyebrow' | 'share_image_url' | 'show_toc' | 'show_updated' | 'publish_at' | 'unpublish_at' | 'review_requested' | 'review_note' | 'updated_by' | 'parent_id' | 'nav_placement' | 'nav_label' | 'nav_sort'>
      guide_picks: Table<GuidePickRow, 'description' | 'icon' | 'items' | 'sort' | 'published'>
      page_redirects: Table<PageRedirectRow, 'created_at'>
      map_places: Table<MapPlaceRow, 'slug' | 'category' | 'address' | 'description' | 'aliases' | 'also_in' | 'published' | 'tip'>
      eatery_areas: Table<EateryAreaRow, 'description' | 'sort'>
      eatery_closures: Table<EateryClosureRow, 'eateries'>
      resource_groups: Table<ResourceGroupRow, 'description' | 'icon' | 'sort'>
      resources: Table<ResourceRow, 'description' | 'place_id' | 'sort' | 'published' | 'tip'>
      events: Table<ClubEventRow, 'location' | 'description' | 'href' | 'image_url' | 'image_alt' | 'status' | 'tags' | 'online_url' | 'sessions' | 'published'>
      executives: Table<ExecutiveRow, 'id' | 'bio' | 'is_founder' | 'avatar_url' | 'service' | 'contact' | 'published'>
      affiliates: Table<AffiliateRow, 'id' | 'wordmark_bottom' | 'summary' | 'description' | 'pin_key' | 'logo_url' | 'discord_url' | 'sort' | 'published'>
      map_connections: Table<MapConnectionRow, 'id' | 'note' | 'in_osm' | 'half_width' | 'favor' | 'ends' | 'stairs' | 'penalty' | 'sort' | 'published'>
      contact_messages: Table<ContactMessageRow, 'id' | 'subject' | 'read_at' | 'read_by'>
      page_revisions: Table<PageRevisionRow, 'saved_by' | 'saved_at'>
      post_revisions: Table<PostRevisionRow, 'saved_by' | 'saved_at'>
      eateries: Table<
        EateryRow,
        'dining_hall' | 'address' | 'description' | 'hours' | 'schedule' | 'status' | 'note' | 'lat' | 'lng' | 'locations' | 'place_id' | 'url' | 'aliases' | 'sort' | 'published' | 'checked_on' | 'tip'
      >
      homepage: Table<HomepageRow, 'content' | 'updated_by'>
      page_meta: Table<PageMetaRow, 'title' | 'description' | 'updated_by'>
      club_settings: Table<ClubSettingsRow, Exclude<keyof ClubSettingsRow, 'id' | 'updated_at'>>
      terms: Table<TermRow>
      dues_payments: Table<DuesPaymentRow, 'paid_on' | 'method' | 'note' | 'recorded_by'>
      join_requests: Table<JoinRequestRow, 'id' | 'major' | 'year' | 'message' | 'status' | 'member_id' | 'handled_at' | 'handled_by'>
      event_rsvps: Table<EventRsvpRow, 'id'>
      faqs: Table<FaqRow, 'sort' | 'published'>
      redirects: Table<RedirectRow, 'note' | 'created_by'>
      meeting_minutes: Table<MeetingMinutesRow, 'attendees' | 'notes' | 'file_url' | 'recorded_by'>
      sponsors: Table<SponsorRow, 'href' | 'logo_url' | 'tier' | 'blurb' | 'starts_on' | 'ends_on' | 'sort' | 'published'>
      activity: Table<ActivityRow, 'actor_email' | 'subject'>
    }
    Views: { [_ in never]: never }
    Functions: {
      is_officer: { Args: { [_ in never]: never }; Returns: boolean }
      is_admin: { Args: { [_ in never]: never }; Returns: boolean }
      is_staff: { Args: { [_ in never]: never }; Returns: boolean }
    }
    Enums: {
      officer_role: OfficerRole
      member_status: MemberStatus
      publish_status: PublishStatus
    }
    CompositeTypes: { [_ in never]: never }
  }
}
