import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import { api } from "../../../../lib/api"
import type { Invoice, PO } from "../../types"

export default function usePoDetail() {
  const { poId = "0" } = useParams()
  const [po, setPo] = useState<PO | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadPage() {
      setLoading(true)
      setError("")
      try {
        const [poResponse, invoicesResponse] = await Promise.all([
          api.get<PO>(`/billing/po/${poId}`),
          api.get<Invoice[]>("/billing/invoices", { params: { po_id: Number(poId) } }),
        ])
        if (cancelled) return
        setPo(poResponse.data)
        setInvoices(Array.isArray(invoicesResponse.data) ? invoicesResponse.data : [])
      } catch (requestError) {
        if (cancelled) return
        const detail = (requestError as { response?: { data?: { detail?: string } } }).response?.data?.detail
        setError(detail ?? "Unable to load PO details.")
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadPage()
    return () => {
      cancelled = true
    }
  }, [poId])

  const sortedInvoices = useMemo(() => [...invoices].sort((left, right) => right.id - left.id), [invoices])

  return {
    po,
    invoices: sortedInvoices,
    loading,
    error,
  }
}
