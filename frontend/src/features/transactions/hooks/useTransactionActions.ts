import { useState } from "react"

import { api } from "../../../lib/api"

type ExecModal = {
  open: boolean
  transaction_id: number
  to_id: number
  version: number
  title: string
}

type ConfirmCancel = {
  open: boolean
  txId: number
  version: number
}

export default function useTransactionActions({
  cancelBadgeId,
  onReload,
}: {
  cancelBadgeId: number | null
  onReload: () => Promise<void>
}) {
  const [transitionError, setTransitionError] = useState("")
  const [execModal, setExecModal] = useState<ExecModal>({
    open: false,
    transaction_id: 0,
    to_id: 0,
    version: 0,
    title: "Set Execution Date",
  })
  const [transitioning, setTransitioning] = useState<number | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<ConfirmCancel>({ open: false, txId: 0, version: 0 })
  const [cancelError, setCancelError] = useState("")

  async function applyTransition(txId: number, toId: number, version: number, executionDate?: string) {
    setTransitioning(txId)
    setTransitionError("")
    try {
      await api.patch(`/transactions/${txId}/status`, {
        status_id: toId,
        version,
        execution_date: executionDate ?? null,
      })
      await onReload()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (status === 409) {
        setTransitionError(detail ?? "Transaction was modified by another user — please refresh")
        await onReload()
      }
    } finally {
      setTransitioning(null)
    }
  }

  async function doCancel(txId: number, version: number) {
    if (!cancelBadgeId) return
    setCancelError("")
    try {
      await api.patch(`/transactions/${txId}/status`, { status_id: cancelBadgeId, version })
      setConfirmCancel({ open: false, txId: 0, version: 0 })
      await onReload()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (status === 409) {
        setCancelError(detail ?? "Transaction was modified by another user — please refresh")
        await onReload()
      } else {
        setCancelError(detail ?? "Failed to cancel transaction.")
      }
    }
  }

  return {
    transitionError,
    execModal,
    setExecModal,
    transitioning,
    confirmCancel,
    setConfirmCancel,
    cancelError,
    setCancelError,
    applyTransition,
    doCancel,
  }
}
