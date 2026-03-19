import axios from "axios"

const baseURL = import.meta.env.VITE_API_URL || "/api/v1"

export const api = axios.create({
  baseURL,
})

let refreshPromise: Promise<string | null> | null = null

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original?._retry) {
      return Promise.reject(error)
    }

    if (!refreshPromise) {
      const refreshToken = localStorage.getItem("refresh_token")
      if (!refreshToken) {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        return Promise.reject(error)
      }

      refreshPromise = api
        .post("/auth/refresh", { refresh_token: refreshToken })
        .then((response) => {
          localStorage.setItem("access_token", response.data.access_token)
          localStorage.setItem("refresh_token", response.data.refresh_token)
          return response.data.access_token as string
        })
        .catch(() => {
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
          return null
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    const nextToken = await refreshPromise
    if (!nextToken) {
      return Promise.reject(error)
    }

    original._retry = true
    original.headers = original.headers ?? {}
    original.headers.Authorization = `Bearer ${nextToken}`
    return api(original)
  },
)
