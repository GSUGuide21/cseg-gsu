import { useEffect } from "react"

export const useDocumentTitle = (title: string, useDefaultTitle = false) => {
  const defaultTitle = "Campus Survival and Engagement Group"
  const appTitle = `${title} | ${defaultTitle}`

  useEffect(() => {
    document.title = useDefaultTitle ? appTitle : title
    return () => {
      document.title = defaultTitle
    }
  }, [appTitle, title, useDefaultTitle])
}