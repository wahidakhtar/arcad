export function isBBRechargeTransaction({
  projectKey,
  typeKey,
  siteId,
  recipientId,
  remarks,
}: {
  projectKey?: string | null
  typeKey?: string | null
  siteId?: number | null
  recipientId?: number | null
  remarks?: string | null
}) {
  return (
    projectKey === "bb"
    && typeKey === "fe_pay"
    && siteId != null
    && recipientId == null
    && String(remarks ?? "").toLowerCase().startsWith("recharge request")
  )
}

export function transactionTypeLabel({
  projectKey,
  typeKey,
  defaultLabel,
  siteId,
  recipientId,
  remarks,
}: {
  projectKey?: string | null
  typeKey?: string | null
  defaultLabel?: string | null
  siteId?: number | null
  recipientId?: number | null
  remarks?: string | null
}) {
  if (isBBRechargeTransaction({ projectKey, typeKey, siteId, recipientId, remarks })) {
    return "Recharge"
  }
  return defaultLabel ?? "Transaction"
}

export function transactionExecutionLabel({
  projectKey,
  typeKey,
  siteId,
  recipientId,
  remarks,
}: {
  projectKey?: string | null
  typeKey?: string | null
  siteId?: number | null
  recipientId?: number | null
  remarks?: string | null
}) {
  if (isBBRechargeTransaction({ projectKey, typeKey, siteId, recipientId, remarks })) {
    return "Recharge Date"
  }
  return typeKey === "ref" ? "Refund Date" : typeKey === "rec" ? "Recharge Date" : "Execution Date"
}
