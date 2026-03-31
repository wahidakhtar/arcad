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
}: SiteFieldsSectionProps) {
  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Details</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {fields.filter((field) => !BILLING_FIELDS.has(field.key)).map((field) => {
          const displayValue = displayValueForField(site, field, badgeById, stateById)
          const isReadOnly = READ_ONLY_FIELDS.has(field.key)
          const isCompleted = site.status_key === "comp"
          const rawValue = draftValueForField(site, field)
          const isEmpty = field.type !== "bool" && (rawValue === "" || rawValue === null || rawValue === undefined)
          const isFinancial = ["budget", "cost", "paid", "balance"].includes(field.key)
          const canEdit = canSiteWrite && !isReadOnly && !isCompleted
          const isVisitOutcomeField = projectKey === "md" && (field.key === "visit_date" || field.key === "outcome")
          const openEditor = isVisitOutcomeField ? onOpenVisitOutcome : () => onOpenField(field)

          return (
            <DetailFieldCard
              key={field.key}
              label={field.label}
              value={isFinancial ? (
                <span className="block text-right font-semibold tabular-nums text-jscolors-crimson">
                  {formatCurrency(displayValue as string | number | null | undefined)}
                </span>
              ) : (
                <FieldRenderer field={field} value={displayValue} />
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
