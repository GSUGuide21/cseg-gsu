import localFont from 'next/font/local'

/**
 * The game's typefaces, each loaded once here (every localFont call is a font of its own,
 * downloaded on its own) and imported where they're used. They're the show's:
 *
 *   korinna    clues, answers, and the round announcements
 *   swissBT    category titles
 *   swissValue the dollar values on the tiles
 *   univers    team names and scores
 *
 * Each is one face declared with no weight, so the game's bold text draws it thickened
 * by the browser: the look the board was designed with. (OPTIKorinnaExtraBoldAgency.otf,
 * in the same folder, is Korinna's true Extra Bold, if the clues ever want it.)
 */

export const korinna = localFont({
  src: '../../../public/assets/fonts/OPTIKorinna-Agency.ttf',
  fallback: ['Georgia', 'serif'],
})

export const swissBT = localFont({
  src: '../../../public/assets/fonts/Swiss 921 BT.ttf',
  fallback: ['Arial Black', 'Arial', 'sans-serif'],
})

export const swissValue = localFont({
  src: '../../../public/assets/fonts/Swiss 911 Ultra Compressed BT.ttf',
  fallback: ['Impact', 'Arial Narrow', 'sans-serif'],
})

export const univers = localFont({
  src: '../../../public/assets/fonts/Univers 75 Black Regular.otf',
  fallback: ['Arial Black', 'Arial', 'sans-serif'],
})
