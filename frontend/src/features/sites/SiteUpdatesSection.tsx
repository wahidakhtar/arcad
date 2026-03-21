import { useState, type ReactNode } from "react"
import { api } from "../../lib/api"
import type { UpdateRow } from "./siteDetailTypes"
import { TODAY } from "./siteDetailHelpers"

function InfoRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[20px] border border-jscolors-crimson/10 bg-white px-4 py-4">
      <div className="text-sm font-semibold text-jscolors-text">{title}</div>
      <div className="mt-1 text-sm text-jscolors-text/60">{text}</div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[20px] border border-dashed border-jscolors-crimson/18 bg-jscolors-crimson/[0.03] px-4 py-4 text-sm text-jscolors-text/60">{text}</div>
}

function ActionPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">{title}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default function SiteUpdatesSection({
  updates,
  canReadOpsUpdates,
  canReadAccUpdates,
  canAddUpdate,
  projectId,
  siteId,
  onReload,
}: {
  updates: UpdateRow[]
  canReadOpsUpdates: boolean
  canReadAccUpdates: boolean
  canAddUpdate: boolean
  projectId: number | undefined
  siteId: number
  onReload: () => Promise<void>
}) {
  const [updateForm, setUpdateForm] = useState({ date: TODAY, update: "", followup_date: "" })

  if (!canReadOpsUpdates && !canReadAccUpdates && !canAddUpdate) return null

  const visibleUpdates = updates.filter((row) => {
    const t = row.update_type ?? "ops"
    if (t === "finance") return canReadAccUpdates
    return canReadOpsUpdates
  })

  return (
    <ActionPanel title="Updates">
      {canAddUpdate && (
        <div className="grid gap-3">
          <input
            type="date"
            value={updateForm.date}
            onChange={(e) => setUpdateForm((c) => ({ ...c, date: e.target.value }))}
            className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
          />
          <textarea
            value={updateForm.update}
            onChange={(e) => setUpdateForm((c) => ({ ...c, update: e.target.value }))}
            placeholder="Update"
            rows={3}
            className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
          />
          <input
            type="date"
            value={updateForm.followup_date}
            onChange={(e) => setUpdateForm((c) => ({ ...c, followup_date: e.target.value }))}
            className="rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 outline-none"
          />
          <button
            type="button"
            className="premium-button"
            onClick={() => {
              void api
                .post("/updates", {
                  project_id: projectId,
                  site_id: siteId,
                  date: updateForm.date,
                  update: updateForm.update,
                  followup_date: updateForm.followup_date || null,
                })
                .then(() => {
                  setUpdateForm({ date: TODAY, update: "", followup_date: "" })
                  return onReload()
                })
            }}
          >
            Add Update
          </button>
        </div>
      )}
      <div className={canAddUpdate ? "mt-4 space-y-3" : "space-y-3"}>
        {visibleUpdates.length ? visibleUpdates.map((row) => (
          <InfoRow
            key={row.id}
            title={row.date}
            text={`${row.update}${row.followup_date ? ` • Follow-up ${row.followup_date}` : ""}${row.update_type === "finance" ? " [Finance]" : ""}`}
          />
        )) : <EmptyState text="No updates yet" />}
      </div>
    </ActionPanel>
  )
}
