import { THEME_STORAGE_KEY } from '@/lib/constants'

export { THEME_STORAGE_KEY }

/** Browser-chrome colors (`<meta name="theme-color">`), matching --bg in globals.css. */
export const THEME_COLORS = { light: '#ffffff', dark: '#0b0f19' } as const

/** Fired on window when the theme toggle changes the stored theme. */
export const THEME_EVENT = 'cseg-theme'

/**
 * Runs in <head> before first paint so a saved dark theme applies immediately
 * (otherwise the page flashes light until React hydrates). Also creates the
 * theme-color meta, which ThemeColorMeta keeps in sync afterwards.
 * Default is light until the visitor toggles.
 */
export const THEME_INIT_SCRIPT = `(function () {
  var dark = false;
  try { dark = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) === "dark"; } catch (e) {}
  document.documentElement.classList.toggle("dark", dark);
  var meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = dark ? ${JSON.stringify(THEME_COLORS.dark)} : ${JSON.stringify(THEME_COLORS.light)};
  document.head.appendChild(meta);
})();`
