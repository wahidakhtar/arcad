export function isBBRechargeTransaction({
  projectKey,
  typeKey,
  siteId,
  remarks,
}: {
  projectKey?: string | null
  typeKey?: string | null
  siteId?: number | null
  remarks?: string | null
}) {
  return (
    projectKey === "bb"
    && typeKey === "fe_pay"
    && siteId != null
    && (
      String(remarks ?? "").toLowerCase().startsWith("recharge request")
      || /^\s*\d+\s+(days|months)\s*$/i.test(String(remarks ?? ""))
    )
  )
}

export function transactionDisplayRemarks({
  projectKey,
  typeKey,
  siteId,
  remarks,
}: {
  projectKey?: string | null
  typeKey?: string | null
  siteId?: number | null
  remarks?: string | null
}) {
  if (isBBRechargeTransaction({ projectKey, typeKey, siteId, remarks })) {
    const normalized = String(remarks ?? "").trim()
    return normalized.toLowerCase().startsWith("recharge request")
      ? normalized.split("•").slice(1).join("•").trim() || null
      : normalized || null
  }
  return remarks ?? null
}

export function transactionTypeLabel({
  projectKey,
  typeKey,
  defaultLabel,
  siteId,
  remarks,
}: {
  projectKey?: string | null
  typeKey?: string | null
  defaultLabel?: string | null
  siteId?: number | null
  remarks?: string | null
}) {
  if (isBBRechargeTransaction({ projectKey, typeKey, siteId, remarks })) {
    return "Recharge"
  }
  return defaultLabel ?? "Transaction"
}

export function transactionExecutionLabel({
  projectKey,
  typeKey,
  siteId,
  remarks,
}: {
  projectKey?: string | null
  typeKey?: string | null
  siteId?: number | null
  remarks?: string | null
}) {
  if (isBBRechargeTransaction({ projectKey, typeKey, siteId, remarks })) {
    return "Recharge Date"
  }
  return typeKey === "ref" ? "Refund Date" : typeKey === "rec" ? "Recharge Date" : "Execution Date"
}
