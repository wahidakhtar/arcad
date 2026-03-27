import { useCallback, useEffect, useMemo, useState } from "react"

import { api } from "../lib/api"

type PrimitiveFilterValue = string | number | boolean | null | undefined

type PaginatedResponse<T> = {
  items: T
  total: number
  page: number
  page_size: number
  pages: number
}

export type PaginationState = {
  page: number
  pages: number
  total: number
  pageSize: number
}

type UseListPageOptions<TFilters extends Record<string, PrimitiveFilterValue>> = {
  endpoint: string
  initialFilters?: TFilters
  buildParams?: (filters: TFilters) => Record<string, PrimitiveFilterValue>
  pageSize?: number
}

export function useListPage<TData = Array<Record<string, unknown>>, TFilters extends Record<string, PrimitiveFilterValue> = Record<string, never>>({
  endpoint,
  initialFilters,
  buildParams,
  pageSize = 0,
}: UseListPageOptions<TFilters>) {
  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState<TFilters>((initialFilters ?? {}) as TFilters)
  const [reloadToken, setReloadToken] = useState(0)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationState | null>(null)

  const baseParams = useMemo(() => (buildParams ? buildParams(filters) : filters), [buildParams, filters])
  const params = useMemo(() => {
    if (!pageSize) return baseParams
    return { ...baseParams, page, page_size: pageSize }
  }, [baseParams, page, pageSize])
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")

    void api
      .get(endpoint, { params })
      .then((response) => {
        if (cancelled) return
        const raw = response.data
        if (raw && typeof raw === "object" && "items" in raw) {
          const paginated = raw as PaginatedResponse<TData>
          setData(paginated.items)
          setPagination({
            page: paginated.page,
            pages: paginated.pages,
            total: paginated.total,
            pageSize: paginated.page_size,
          })
        } else {
          setData(raw as TData)
          setPagination(null)
        }
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

  // Reset to page 1 when base params change (filters/search change)
  const baseParamsKey = JSON.stringify(baseParams)
  useEffect(() => {
    setPage(1)
  }, [baseParamsKey])  // eslint-disable-line react-hooks/exhaustive-deps

  function setFilter<K extends keyof TFilters>(key: K, value: TFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const refetch = useCallback(() => {
    setReloadToken((current) => current + 1)
  }, [])

  return { data, loading, error, filters, setFilter, refetch, page, setPage, pagination }
}
