import type { Executive } from './components/types'

/**
 * The executives /executives shows until the dashboard's Executives has any (officers add
 * them there). Someone with a service interval that has no endYear shows as current,
 * everyone else as past; the page orders them by office. An avatarSrc is a path under
 * public/, such as /assets/executives/name.jpg.
 */
export const EXECUTIVES: readonly Executive[] = []
