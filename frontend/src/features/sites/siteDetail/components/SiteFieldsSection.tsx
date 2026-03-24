import DetailFieldCard from "../../../../components/ui/DetailFieldCard"
import FieldRenderer from "../../../../components/ui/FieldRenderer"
import {
  READ_ONLY_FIELDS,
  displayValueForField,
  draftValueForField,
} from "../../siteDetailHelpers"
import type { Badge, SiteDetail, StateRow, UIField } from "../../siteDetailTypes"

type SiteFieldsSectionProps = {
  site: SiteDetail
  fields: UIField[]
  badgeById: Map<number, Badge>
  stateById: Map<number, StateRow>
  canSiteWrite: boolean
  onOpenField: (field: UIField) => void
}

export default function SiteFieldsSection({
  site,
  fields,
  badgeById,
  stateById,
  canSiteWrite,
  onOpenField,
}: SiteFieldsSectionProps) {
  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Details</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const displayValue = displayValueForField(site, field, badgeById, stateById)
          const isReadOnly = READ_ONLY_FIELDS.has(field.key)
          const rawValue = draftValueForField(site, field)
          const isEmpty = field.type !== "bool" && (rawValue === "" || rawValue === null || rawValue === undefined)

          return (
            <DetailFieldCard
              key={field.key}
              label={field.label}
              value={<FieldRenderer field={field} value={displayValue} />}
              onAdd={canSiteWrite && !isReadOnly && isEmpty ? () => onOpenField(field) : undefined}
              onEdit={canSiteWrite && !isReadOnly && !isEmpty ? () => onOpenField(field) : undefined}
            />
          )
        })}
      </div>
    </section>
  )
}
