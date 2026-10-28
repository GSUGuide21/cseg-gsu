import {
  useMedia,
  type UseMediaOptions
} from "./useMedia"

export const useTheme = (theme: string, options: UseMediaOptions = {}): boolean => {
  return useMedia(`(prefers-color-scheme: ${theme})`, options)
}