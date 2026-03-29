import BadgeDropdown from "../../../../components/ui/BadgeDropdown"
import {
  DOC_BADGE_FIELDS,
  getFieldValue,
  selectedBadgeFallback,
  transitionOptions,
} from "../../siteDetailHelpers"
import type { Badge, SiteDetail, TransitionRow, UIField } from "../../siteDetailTypes"

type SiteHeaderProps = {
  site: SiteDetail
  badgeFields: UIField[]
  badgeById: Map<number, Badge>
  transitions: TransitionRow[]
  updatingBadgeKey: string
  docBadgeEditable: boolean
  isAssetTransfer: boolean
  onTransition: (fieldKey: string, toId: number) => void
}

export default function SiteHeader({
  site,
  badgeFields,
  badgeById,
  transitions,
  updatingBadgeKey,
  docBadgeEditable,
  isAssetTransfer,
  onTransition,
}: SiteHeaderProps) {
  return (
    <>
      {badgeFields.map((field) => {
        if (field.key === "tx_copy_status" && !isAssetTransfer) return null

        const badgeValue = getFieldValue(site, field)
        if (typeof badgeValue !== "number") return null
        const currentBadge = badgeById.get(badgeValue) ?? null
        const isDocBadge = DOC_BADGE_FIELDS.has(field.key)
        const nextTransitions = (!isDocBadge || docBadgeEditable)
          ? transitionOptions(transitions, field.key, badgeValue)
          : []

        return (
          <div key={field.key} className="shrink-0 rounded-[18px] border border-jscolors-crimson/10 bg-white px-3 py-2">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">{field.label}</div>
            <div className="mt-2">
              <BadgeDropdown
                badge={currentBadge ?? null}
                fallback={String(selectedBadgeFallback(badgeValue))}
                options={nextTransitions.map((transition) => ({
                  id: transition.to_id,
                  label: transition.to_label,
                  color: badgeById.get(transition.to_id)?.color ?? null,
                }))}
                onSelect={(toId) => onTransition(field.key, toId)}
                disabled={updatingBadgeKey === field.key}
              />
            </div>
          </div>
        )
      })}
    </>
  )
}
