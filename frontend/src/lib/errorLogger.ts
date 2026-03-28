const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "https://arcad-production.up.railway.app/api/v1"

interface ErrorPayload {
  error_type: "api_error" | "js_exception" | "page_load_failure"
  error_message: string
  stack_trace?: string
  http_status?: number
  http_url?: string
  extra?: Record<string, unknown>
}

export function logError(payload: ErrorPayload): void {
  try {
    const token = localStorage.getItem("access_token")
    fetch(`${BASE_URL}/error-log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...payload, page_url: window.location.href }),
    }).catch(() => {})
  } catch {
    // intentionally silent
  }
}
