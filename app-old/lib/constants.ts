export const XXS_SCREEN = 320
export const XS_SCREEN = 480
export const SM_SCREEN = 640
export const MD_SCREEN = 768
export const LG_SCREEN = 1024
export const XL_SCREEN = 1280
export const XXL_SCREEN = 1536
export const XXXL_SCREEN = 1920

export const SCREEN_SIZES: Record<string, number> = {
  XXS: XXS_SCREEN,
  XS: XS_SCREEN,
  SM: SM_SCREEN,
  MD: MD_SCREEN,
  LG: LG_SCREEN,
  XL: XL_SCREEN,
  XXL: XXL_SCREEN,
  XXXL: XXXL_SCREEN,
} as const

export type ScreenSize = keyof typeof SCREEN_SIZES

export const MIN_DESKTOP_WIDTH = SCREEN_SIZES.LG  // 1024px
export const MIN_TABLET_WIDTH = SCREEN_SIZES.MD
export const MAX_TABLET_WIDTH = SCREEN_SIZES.LG - 1 // 1023px
export const MIN_MOBILE_WIDTH = SCREEN_SIZES.SM
export const MAX_MOBILE_WIDTH = SCREEN_SIZES.MD - 1 // 767px

export const DEFAULT_THEME = "light"
export const DEFAULT_LANGUAGE = "en"

export const THEME_STORAGE_KEY = "cseg-theme"

// Button variants
export const BUTTON_VARIANTS: string[] = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "success",
  "warning",
  "error",
  "danger",
  "icon",
  "link",
  "text",
  "disabled"
]

// Button sizes
export const BUTTON_SIZES: Record<string, number> = {
  // Extra small sizes
  // These sizes are used for small buttons, like in a toolbar or a compact UI
  // They are not used for the default button sizes 
  micro: 1,
  mini: 2,
  tiny: 4,
  xxxs: 8,
  xxs: 10,
  xs: 12,

  // Small to large sizes
  // These sizes are used for buttons in a standard UI
  sm: 14,
  md: 16,
  lg: 18,

  // Exra large sizes
  // These sizes are used for buttons in a large UI, like a modal or a full screen
  xl: 20,
  xxl: 22,
  xxxl: 24,
  giant: 32,
  huge: 40,
  massive: 48,

  // Extra extra large sizes
  // These sizes are used for buttons in a very large UI, like a full screen or a modal
  // They are not used for the default button sizes
  colossal: 56,
  gargantuan: 64,
  titanic: 72,
  leviathan: 80,
  behemoth: 88,
  mammoth: 96,

  // Special button sizes
  "icon": 24, // Default icon button size
  "icon-micro": 1,
  "icon-mini": 2,
  "icon-tiny": 4,
  "icon-xxxs": 8,
  "icon-xxs": 10,
  "icon-xs": 12,
  "icon-sm": 16,
  "icon-md": 20,
  "icon-lg": 24,
  "icon-xl": 28,
  "icon-xxl": 32,
  "icon-xxxl": 36,
  "icon-giant": 40,
  "icon-huge": 48,
  "icon-massive": 56,
  "icon-colossal": 64,
  "icon-gargantuan": 72,
  "icon-titanic": 80,
  "icon-leviathan": 88,
  "icon-behemoth": 96,
  "icon-mammoth": 104
}

// Category sizes
export const CATEGORY_SIZE: Record<string, number> = {
  MIN: 1, // Minimum number of categories in a round
  MAX: 6, // Maximum number of categories in a round
  DEFAULT: 6 // Default number of categories per round
}

// Clue sizes
export const CLUE_SIZE: Record<string, number> = {
  MIN: 1, // Minimum number of clues in a category
  MAX: 5, // Maximum number of clues in a category
  DEFAULT: 5 // Default number of clues per category
}

// Base clue values
export const BASE_CLUE_VALUE: Record<string, number> = {
  MIN: 100, // Minimum value of a clue
  MAX: 1000, // Maximum value of a clue
  DEFAULT: 100, // Default value of a clue
  STEP: 100
}