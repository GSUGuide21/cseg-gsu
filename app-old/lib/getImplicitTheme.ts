export type Theme = "light" | "dark" | "system"

export const getImplicitTheme = (theme: Theme = "system"): Theme => {
  if (theme === "system") {
    if (typeof window !== "undefined") {
      const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
      return isDarkMode ? "dark" : "light"
    }

    return "light"
  }

  return theme
}