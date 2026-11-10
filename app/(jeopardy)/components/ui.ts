/**
 * The game's look, shared by the clue screen and Final Jeopardy so they match the board:
 * the blue backdrop, panels and buttons, text sized to the screen, and the card-flip used
 * between steps.
 */

/** The full-screen backdrop behind a clue (Daily Doubles get the gold one) */
export const clueBackdrop = 'bg-radial from-[#1c2d5f] via-[#1a2b7d] to-[#0b1f90]'
export const dailyDoubleBackdrop = 'bg-radial from-[#b45309] via-[#d97706] to-[#f59e0b]'

/** The board's tile blue, and its gold */
export const tileBlue = 'bg-[#071277]'
export const gold = '#d69f4c'

/** Words on the backdrop: white, uppercase, with the board's hard shadow */
export const onBackdrop = 'font-bold uppercase leading-[1.15] text-balance text-white text-shadow-[0.05em_0.05em_0_rgba(0,0,0,1)]'

/** A team's panel on the backdrop */
export const panel = 'rounded-xl border border-white/15 bg-black/25 backdrop-blur-sm'

/** The main way forward (gold, as on the title screen), and a quieter one beside it */
export const primaryButton =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#d69f4c] px-[1.2em] py-[0.55em] font-bold text-[#071277] shadow-lg transition-colors hover:bg-[#e8b766] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40 text-[clamp(1rem,2.2vmin,1.6rem)]'
export const quietButton =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/25 bg-black/20 px-[1em] py-[0.5em] font-semibold text-white/85 transition-colors hover:bg-black/40 focus-visible:outline-2 focus-visible:outline-white text-[clamp(0.85rem,1.6vmin,1.1rem)]'

/** Right and wrong, for scoring a team */
export const rightButton = 'flex-1 cursor-pointer rounded-lg bg-green-600 px-2 py-[1vmin] font-bold text-white shadow-lg transition-colors hover:bg-green-700'
export const wrongButton = 'flex-1 cursor-pointer rounded-lg bg-red-600 px-2 py-[1vmin] font-bold text-white shadow-lg transition-colors hover:bg-red-700'

/** Sizes that scale with the screen, for a projector across a room */
export const size = {
  label: 'text-[clamp(1rem,2.6vmin,2rem)]',
  heading: 'text-[clamp(1.75rem,5vmin,4.5rem)]',
  team: 'text-[clamp(1rem,2.4vmin,1.75rem)]',
  small: 'text-[clamp(0.8rem,1.6vmin,1.1rem)]',
}

/**
 * How big a clue's words are: as big as the screen allows for its length, so a short clue
 * fills a projector and a long one still fits without scrolling
 */
export const clueTextSize = (text: string, hasMedia = false) => {
  const n = text.length
  const share = n <= 50 ? 7.5 : n <= 100 ? 6 : n <= 160 ? 5 : n <= 240 ? 4.2 : 3.5
  return `clamp(1.5rem, ${hasMedia ? share * 0.7 : share}vmin, 6.5rem)`
}

/** A score as the room reads it: "$1,200", and "−$200" when a team's below zero */
export const money = (amount: number, currency: string) => `${amount < 0 ? '−' : ''}${currency}${Math.abs(amount).toLocaleString()}`

/** The words flip in, like a card turned over, and fade out when they go */
export const flip = {
  initial: { opacity: 0, rotateX: -70, y: 30 },
  animate: { opacity: 1, rotateX: 0, y: 0, transition: { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] as const } },
  exit: { opacity: 0, rotateX: 50, y: -30, transition: { duration: 0.2 } },
}
