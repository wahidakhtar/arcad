import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"

import { subscribe } from "../../../../hooks/useWebSocket"
import { getPoById, getInvoicesByPoId } from "../../../../services/billingService"
import type { Invoice, PO } from "../../types"

export default function usePoDetail() {
  const { poId = "0" } = useParams()
  const [po, setPo] = useState<PO | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const cancelledRef = useRef(false)

  const loadPage = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [poResponse, invoicesResponse] = await Promise.all([
        getPoById(Number(poId)),
        getInvoicesByPoId(Number(poId)),
      ])
      if (cancelledRef.current) return
      setPo(poResponse.data)
      setInvoices(Array.isArray(invoicesResponse.data) ? invoicesResponse.data : [])
    } catch (requestError) {
      if (cancelledRef.current) return
      const detail = (requestError as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(detail ?? "Unable to load PO details.")
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [poId])

  useEffect(() => {
    cancelledRef.current = false
    void loadPage()
    return () => {
      cancelledRef.current = true
    }
  }, [loadPage])

  // Dedup guard — prevents double-refetch when user action + WS event arrive together
  const lastRefetchRef = useRef(0)
  const safeLoad = useCallback(() => {
    const now = Date.now()
    if (now - lastRefetchRef.current < 300) return
    lastRefetchRef.current = now
    void loadPage()
  }, [loadPage])

  // WS subscriptions scoped to this PO
  useEffect(() => {
    const numericPoId = Number(poId)
    const unsub1 = subscribe("PO_UPDATED", (e) => {
      if ((e as { po_id: number }).po_id === numericPoId) safeLoad()
    })
    const unsub2 = subscribe("INVOICE_CREATED", (e) => {
      if ((e as { po_id: number | null }).po_id === numericPoId) safeLoad()
    })
    const unsub3 = subscribe("INVOICE_UPDATED", (e) => {
      if ((e as { po_id: number | null }).po_id === numericPoId) safeLoad()
    })
    return () => {
      unsub1()
      unsub2()
      unsub3()
    }
  }, [poId, safeLoad])

  const sortedInvoices = useMemo(() => [...invoices].sort((left, right) => right.id - left.id), [invoices])

  return {
    po,
    invoices: sortedInvoices,
    loading,
    error,
    loadPage,
  }
}
