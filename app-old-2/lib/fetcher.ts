export const fetcher = async <JSON = unknown>(
  url: string, 
  options?: RequestInit
) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    }
  })

  if (!res.ok && res.status !== 404) {
    const error = new Error("An error occurred while fetching the data.")
    // @ts-expect-error Attach extra info to the error object.
    error.info = await res.json()
    // @ts-expect-error Attach status code to the error object.
    error.status = res.status
    throw error
  } else if (res.status === 404) {
    return null
  }

  return res.json() as Promise<JSON>
}