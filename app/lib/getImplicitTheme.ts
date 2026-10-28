export type Theme = "light" | "dark" | "system" | "auto"

export const getImplicitTheme = (theme: Theme = "system"): Theme => {
  switch (theme) {
    case "auto":
    case "system": {
      if (typeof window !== "undefined") {
        const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
        return isDarkMode ? "dark" : "light"
      }
      return "light"
    }

    case "dark":
    case "light":
      return theme

    default:
      console.warn(`Invalid theme "${theme}" provided. Defaulting to "light".`)
      return "light"
  }
}