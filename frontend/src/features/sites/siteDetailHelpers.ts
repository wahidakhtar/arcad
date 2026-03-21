import type { Badge, JobBucket, SiteDetail, StateRow, TransitionRow, UIField } from "./siteDetailTypes"

export const READ_ONLY_FIELDS = new Set(["budget", "cost", "paid", "balance", "active_fe"])
export const DOC_BADGE_FIELDS = new Set(["wcc_status", "fsr_status", "report_status", "tx_copy_status"])
export const TODAY = new Date().toISOString().slice(0, 10)

export function buildDrafts(site: SiteDetail, fields: UIField[]) {
  return Object.fromEntries(fields.map((field) => [field.key, draftValueForField(site, field)]))
}

export function draftValueForField(site: SiteDetail, field: UIField): string | boolean {
  const value = getFieldValue(site, field)
  if (field.type === "bool") {
    return Boolean(value)
  }
  return value == null ? "" : String(value)
}

export function getFieldValue(site: SiteDetail, field: UIField) {
  if (field.key in site.financials) {
    return site.financials[field.key as keyof SiteDetail["financials"]]
  }
  if (field.key in site.fields) {
    return site.fields[field.key]
  }
  const suffixedKey = `${field.key}_id`
  if (suffixedKey in site.fields) {
    return site.fields[suffixedKey]
  }
  return null
}

export function displayValueForField(
  site: SiteDetail,
  field: UIField,
  badgeById: Map<number, Badge>,
  stateById: Map<number, StateRow>,
) {
  const value = getFieldValue(site, field)
  if (field.type === "dropdown" && field.key === "state_id" && typeof value === "number") {
    return stateById.get(value)?.label ?? value
  }
  if (field.type === "badge" && typeof value === "number") {
    return badgeById.get(value)
  }
  return value
}

export function optionsForField(field: UIField, states: StateRow[]) {
  if (field.key === "state_id") {
    return states.map((state) => ({ label: state.label, value: state.id }))
  }
  return field.options
}

export function isFieldChanged(site: SiteDetail, field: UIField, nextValue: string | boolean | undefined) {
  return draftValueForField(site, field) !== (nextValue ?? "")
}

export function transitionOptions(transitions: TransitionRow[], fieldKey: string, fromId: number) {
  return transitions.filter((t) => t.field_key === fieldKey && t.from_id === fromId)
}

export function selectedBadgeFallback(value: unknown) {
  if (value == null || value === "") return "-"
  return String(value)
}

export function transactionDraftKey(feId: number, bucketKey: string) {
  return `${feId}:${bucketKey}`
}

export function bucketLabel(jobBuckets: JobBucket[], bucketKey: string) {
  return jobBuckets.find((b) => b.key === bucketKey)?.label ?? bucketKey.toUpperCase()
}

export function projectByKey<T extends { key: string }>(projects: T[], key: string): T | null {
  return projects.find((p) => p.key === key) ?? null
}
