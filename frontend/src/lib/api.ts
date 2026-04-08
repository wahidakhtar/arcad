import axios from "axios"
import { logError } from "./errorLogger"

// Default to the same-origin API path so self-hosted deployments do not depend on Railway.
const baseURL = import.meta.env.VITE_API_URL || "/api/v1"

export const api = axios.create({
  baseURL,
  withCredentials: true, // send httpOnly auth cookies on every request
})

let refreshPromise: Promise<boolean> | null = null
let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

function handleUnauthorized() {
  unauthorizedHandler?.()
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const requestUrl = typeof original?.url === "string" ? original.url : ""
    if (error.response?.status !== 401 || original?._retry) {
      logError({
        error_type: "api_error",
        http_status: error.response?.status,
        http_url: error.config?.url,
        error_message: (error.response?.data as { detail?: string } | undefined)?.detail ?? error.message,
      })
      return Promise.reject(error)
    }

    // Don't attempt refresh for auth endpoints — signal unauthorized immediately.
    if (requestUrl.includes("/auth/login") || requestUrl.includes("/auth/refresh")) {
      handleUnauthorized()
      return Promise.reject(error)
    }

    if (!refreshPromise) {
      refreshPromise = api
        .post("/auth/refresh") // no body — refresh_token cookie sent automatically
        .then(() => true)
        .catch(() => {
          handleUnauthorized()
          return false
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    const success = await refreshPromise
    if (!success) {
      return Promise.reject(error)
    }

    original._retry = true
    return api(original) // retry with new access_token cookie already set by server
  },
)
