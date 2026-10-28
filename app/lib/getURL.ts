const canUseDOM = !!(typeof window !== 'undefined' && window.document && window.document.createElement)

export const getServerSideURL = () => {
  const url = process.env.NEXT_PUBLIC_SERVER_URL

  if (!url && process.env.NEXT_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.NEXT_PROJECT_PRODUCTION_URL}`
  }

  if (!url) return `http://localhost:${process.env.PORT || 3000}`
  return url
}

export const getClientSideURL = () => {
  if (!canUseDOM) return process.env.NEXT_PROJECT_PRODUCTION_URL ?
    `https://${process.env.NEXT_PROJECT_PRODUCTION_URL}` : 
    (process.env.NEXT_PUBLIC_SERVER_URL || `http://localhost:${process.env.PORT || 3000}`)

  const { protocol, hostname, port } = window.location
  const portString = port ? `:${port}` : ''

  return `${protocol}//${hostname}${portString}`
}