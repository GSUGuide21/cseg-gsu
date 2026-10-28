const hqpPattern = /^[#\?\/].*$/g // hash, query, or path
const canUseURL = typeof URL !== 'undefined' // Check if URL is supported in the current environment

export const isExternal = (url: string): boolean => {
  if (hqpPattern.test(url)) return false
  if (!window || !window.location || !window.location.origin) return false // Check if window and location are available
  return (canUseURL ? new URL(url).origin : url).startsWith('http') 
    && !url.startsWith(window.location.origin) 
    && !url.startsWith(process.env.NEXT_PUBLIC_SERVER_URL || '')
  // Check if the URL is external by comparing its origin with the current window location's origin
}