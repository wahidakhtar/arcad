import { useEffect, useMemo, useState } from "react"

import { api } from "../lib/api"

type PrimitiveFilterValue = string | number | boolean | null | undefined

type UseListPageOptions<TFilters extends Record<string, PrimitiveFilterValue>> = {
  endpoint: string
  initialFilters?: TFilters
  buildParams?: (filters: TFilters) => Record<string, PrimitiveFilterValue>
}

export function useListPage<TData = Array<Record<string, unknown>>, TFilters extends Record<string, PrimitiveFilterValue> = Record<string, never>>({
  endpoint,
  initialFilters,
  buildParams,
}: UseListPageOptions<TFilters>) {
  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState<TFilters>((initialFilters ?? {}) as TFilters)
  const [reloadToken, setReloadToken] = useState(0)

  const params = useMemo(() => (buildParams ? buildParams(filters) : filters), [buildParams, filters])
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")

    void api
      .get(endpoint, { params })
      .then((response) => {
        if (cancelled) return
        setData(response.data as TData)
      })
      .catch((requestError: { response?: { data?: { detail?: string } } }) => {
        if (cancelled) return
        setError(requestError.response?.data?.detail ?? "Unable to load page data.")
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [endpoint, params, paramsKey, reloadToken])

  function setFilter<K extends keyof TFilters>(key: K, value: TFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function refetch() {
    setReloadToken((current) => current + 1)
  }

  return { data, loading, error, filters, setFilter, refetch }
}
