export interface ApiEnvelope<T> {
  success?: boolean
  data?: T
  error?: string | { message?: string }
  message?: string
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || payload.success === false) {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : payload.error?.message || payload.message || `Request failed with status ${response.status}`

    throw new Error(message)
  }

  return (payload.data ?? (payload as unknown as T))
}
