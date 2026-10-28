/**
 * The database's shape, matching supabase/migrations. Kept by hand; after changing the
 * schema, regenerate with `npx supabase gen types typescript --linked` and compare.
 */

export type OfficerRole = 'officer' | 'admin'
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
  member_id: string | null
  name: string
  email: string | null
  checked_in_at: string
  checked_in_by: string | null
}

export type PostRow = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string
  cover_image_url: string | null
  status: PublishStatus
  published_at: string | null
  author_email: string | null
  created_at: string
  updated_at: string
}

/** One piece of writing, or split into titled sections */
export type PageLayout = 'document' | 'sections'

/** The most a page's subtitle (or a section's) can be */
export const PAGE_SUBTITLE_MAX = 300
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
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type MapPlaceRow = {
  id: string
  name: string
  category: string
  lat: number
  lng: number
  address: string | null
  description: string
  published: boolean
  created_at: string
  updated_at: string
}

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
  created_at: string
  updated_at: string
}

export type ClubSettingsRow = {
  id: number
  tagline: string | null
  meeting_info: string | null
  contact_email: string | null
  instagram_url: string | null
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
      event_checkins: Table<CheckinRow, 'member_id' | 'email' | 'checked_in_at' | 'checked_in_by'>
      posts: Table<PostRow, 'excerpt' | 'body' | 'cover_image_url' | 'status' | 'published_at' | 'author_email'>
      pages: Table<PageRow, 'description' | 'subtitle' | 'layout' | 'sections' | 'body' | 'status' | 'updated_by'>
      map_places: Table<MapPlaceRow, 'category' | 'address' | 'description' | 'published'>
      eateries: Table<
        EateryRow,
        'dining_hall' | 'address' | 'description' | 'hours' | 'schedule' | 'status' | 'note' | 'lat' | 'lng' | 'locations' | 'place_id' | 'url' | 'aliases' | 'sort' | 'published'
      >
      club_settings: Table<ClubSettingsRow, 'tagline' | 'meeting_info' | 'contact_email' | 'instagram_url' | 'updated_by'>
      activity: Table<ActivityRow, 'actor_email' | 'subject'>
    }
    Views: { [_ in never]: never }
    Functions: {
      is_officer: { Args: { [_ in never]: never }; Returns: boolean }
      is_admin: { Args: { [_ in never]: never }; Returns: boolean }
    }
    Enums: {
      officer_role: OfficerRole
      member_status: MemberStatus
      publish_status: PublishStatus
    }
    CompositeTypes: { [_ in never]: never }
  }
}
