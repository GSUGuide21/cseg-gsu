export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type AvatarStatus = 'online' | 'away' | 'busy' | 'offline'

export interface AvatarProps {
  /** Whose it is: names the avatar and makes the initials when there's no photo */
  name: string
  /** A photo; when it's missing or fails to load, initials show instead */
  src?: string | null
  /** xs 24px, sm 32px, md 40px, lg 48px, xl 64px. Default "md". */
  size?: AvatarSize
  /** Default "circle"; "square" for groups and organizations */
  shape?: 'circle' | 'square'
  /** A dot on the corner, said in words to screen readers */
  status?: AvatarStatus
  /** Leave the avatar out of what screen readers read, when the name is right beside it */
  decorative?: boolean
  className?: string
}

export interface AvatarGroupProps {
  people: { name: string; src?: string | null }[]
  /** How many to show before "+N". Default 4. */
  max?: number
  size?: AvatarSize
  /** Names the group: "Going to Welcome Week" */
  'aria-label'?: string
  className?: string
}
