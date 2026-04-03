import DetailFieldCard from "../../../../components/ui/DetailFieldCard"
import FieldRenderer from "../../../../components/ui/FieldRenderer"
import { formatCurrency } from "../../../../utils/format"
import {
  BILLING_FIELDS,
  READ_ONLY_FIELDS,
  displayValueForField,
  draftValueForField,
} from "../../siteDetailHelpers"
import type { Badge, SiteDetail, StateRow, UIField } from "../../siteDetailTypes"

type SiteFieldsSectionProps = {
  site: SiteDetail
  projectKey: string
  fields: UIField[]
  badgeById: Map<number, Badge>
  stateById: Map<number, StateRow>
  canSiteWrite: boolean
  onOpenField: (field: UIField) => void
  onOpenVisitOutcome: () => void
  onOpenDismantle: () => void
  onOpenAuditResults: () => void
}

export default function SiteFieldsSection({
  site,
  projectKey,
  fields,
  badgeById,
  stateById,
  canSiteWrite,
  onOpenField,
  onOpenVisitOutcome,
  onOpenDismantle,
  onOpenAuditResults,
}: SiteFieldsSectionProps) {
  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Details</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {fields.filter((field) => !BILLING_FIELDS.has(field.key)).map((field) => {
          const normalizedField = projectKey === "bb" && field.key === "active_fe"
            ? { ...field, key: "active_provider", label: "Active Provider" }
            : projectKey === "bb" && field.key === "active_provider"
              ? { ...field, label: "Active Provider" }
              : field
          const displayValue = displayValueForField(site, normalizedField, badgeById, stateById)
          const isReadOnly = READ_ONLY_FIELDS.has(normalizedField.key)
          const isCompleted = site.status_key === "comp"
          const rawValue = draftValueForField(site, normalizedField)
          const isEmpty = normalizedField.type !== "bool" && (rawValue === "" || rawValue === null || rawValue === undefined)
          const isFinancial = ["budget", "cost", "paid", "balance"].includes(normalizedField.key)
          const canEdit = canSiteWrite && !isReadOnly && !isCompleted
          const isVisitOutcomeField = projectKey === "md" && (normalizedField.key === "visit_date" || normalizedField.key === "outcome")
          const isDismantleField = projectKey === "md" && (normalizedField.key === "dismantle_date" || normalizedField.key === "scrap_value")
          const isAuditResultField = projectKey === "ma" && ["audit_date", "mpaint", "mnbr", "arr", "ep", "ec"].includes(normalizedField.key)
          const openEditor = isVisitOutcomeField
            ? onOpenVisitOutcome
            : isDismantleField
              ? onOpenDismantle
              : isAuditResultField
                ? onOpenAuditResults
                : () => onOpenField(normalizedField)

          return (
            <DetailFieldCard
              key={field.key}
              label={normalizedField.label}
              value={isFinancial ? (
                <span className="block text-right font-semibold tabular-nums text-jscolors-crimson">
                  {formatCurrency(displayValue as string | number | null | undefined)}
                </span>
              ) : (
                <FieldRenderer field={normalizedField} value={displayValue} />
              )}
              onAdd={canEdit && isEmpty ? openEditor : undefined}
              onEdit={canEdit && !isEmpty ? openEditor : undefined}
            />
          )
        })}
      </div>
    </section>
  )
}
