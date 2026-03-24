import Button from "../../../components/ui/Button"
import Modal from "../../../components/ui/Modal"
import { useAuth } from "../../../context/AuthContext"
import { fieldCls, labelCls, tableCls, tableWrapCls, tbodyRowCls, tdCls, thCls, theadRowCls } from "../constants"
import useAdminBadges from "../hooks/useAdminBadges"

export default function BadgesPanel() {
  const { can } = useAuth()
  const canWrite = can("admin", "write")
  const {
    badges,
    editingBadge,
    editDraft,
    setEditDraft,
    saving,
    error,
    modalError,
    openEdit,
    closeEdit,
    saveBadge,
  } = useAdminBadges()

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <Modal open={editingBadge !== null} title="Edit Badge" onClose={closeEdit} size="sm">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Label</label>
            <input
              type="text"
              value={editDraft.label}
              onChange={(e) => setEditDraft((draft) => ({ ...draft, label: e.target.value }))}
              className={fieldCls}
            />
          </div>
          <div>
            <label className={labelCls}>Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={editDraft.color || "#cccccc"}
                onChange={(e) => setEditDraft((draft) => ({ ...draft, color: e.target.value }))}
                className="h-8 w-8 cursor-pointer rounded border-0 p-0"
              />
              <input
                type="text"
                value={editDraft.color}
                onChange={(e) => setEditDraft((draft) => ({ ...draft, color: e.target.value }))}
                className="w-28 rounded-xl border border-jscolors-crimson/15 px-2 py-1.5 text-sm outline-none focus:border-jscolors-crimson/40"
                placeholder="#rrggbb"
              />
            </div>
          </div>
          {modalError ? <p className="text-sm text-red-600">{modalError}</p> : null}
          <Button className="w-full" onClick={saveBadge} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </Modal>

      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr className={theadRowCls}>
              <th className={thCls}>ID</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Key</th>
              <th className={thCls}>Label</th>
              <th className={thCls}>Color</th>
              {canWrite ? <th className={thCls}></th> : null}
            </tr>
          </thead>
          <tbody>
            {badges.map((badge) => (
              <tr key={badge.id} className={tbodyRowCls}>
                <td className={tdCls}>{badge.id}</td>
                <td className={tdCls}>{badge.type}</td>
                <td className={tdCls}>{badge.key}</td>
                <td className={tdCls}>{badge.label}</td>
                <td className={tdCls}>
                  <div className="flex items-center gap-2">
                    {badge.color ? (
                      <span className="inline-block h-4 w-4 rounded-full border border-black/10" style={{ background: badge.color }} />
                    ) : null}
                    <span className="text-xs text-jscolors-text/60">{badge.color ?? "—"}</span>
                  </div>
                </td>
                {canWrite ? (
                  <td className={tdCls}>
                    <Button variant="ghost" size="sm" className="py-1.5" onClick={() => openEdit(badge)}>
                      Edit
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
            {badges.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 6 : 5} className="px-5 py-6 text-center text-sm text-jscolors-text/50">
                  No badges configured.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
