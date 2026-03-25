import { api } from "../lib/api"

export const updateTransactionStatus = (
  txId: number,
  data: { status_id: number; version: number; execution_date?: string | null },
) => api.patch(`/transactions/${txId}/status`, data)
