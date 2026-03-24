import Button from "../../../components/ui/Button"
import Modal from "../../../components/ui/Modal"
import { useAuth } from "../../../context/AuthContext"
import { PROJECTS, fieldCls, labelCls, tableCls, tableWrapCls, tbodyRowCls, tdCls, thCls, theadRowCls } from "../constants"
import useAdminTransitions from "../hooks/useAdminTransitions"

export default function TransitionsPanel() {
  const { can } = useAuth()
  const canWrite = can("admin", "write")
  const {
    data,
    addOpen,
    newRow,
    setNewRow,
    adding,
    error,
    modalError,
    openAdd,
    closeAdd,
    handleRemove,
    handleAdd,
  } = useAdminTransitions()

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <Modal open={addOpen} title="Add Transition" onClose={closeAdd}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Project</label>
            <select value={newRow.project} onChange={(e) => setNewRow((row) => ({ ...row, project: e.target.value }))} className={fieldCls}>
              {PROJECTS.map((project) => (
                <option key={project} value={project}>{project.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select value={newRow.type_id} onChange={(e) => setNewRow((row) => ({ ...row, type_id: e.target.value }))} className={fieldCls}>
              <option value="">Select type</option>
              {(data?.transition_types ?? []).map((transitionType) => (
                <option key={transitionType.id} value={transitionType.id}>{transitionType.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>From</label>
            <select value={newRow.from_id} onChange={(e) => setNewRow((row) => ({ ...row, from_id: e.target.value }))} className={fieldCls}>
              <option value="">Select badge</option>
              {(data?.badges ?? []).filter((badge) => badge.type !== "dept" && badge.type !== "level").map((badge) => (
                <option key={badge.id} value={badge.id}>{badge.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>To</label>
            <select value={newRow.to_id} onChange={(e) => setNewRow((row) => ({ ...row, to_id: e.target.value }))} className={fieldCls}>
              <option value="">Select badge</option>
              {(data?.badges ?? []).filter((badge) => badge.type !== "dept" && badge.type !== "level").map((badge) => (
                <option key={badge.id} value={badge.id}>{badge.label}</option>
              ))}
            </select>
          </div>
          {modalError ? <p className="text-sm text-red-600">{modalError}</p> : null}
          <Button className="w-full" onClick={handleAdd} disabled={adding}>
            {adding ? "Adding…" : "Add"}
          </Button>
        </div>
      </Modal>

      {canWrite ? (
        <div className="flex justify-end">
          <Button className="py-1.5 px-4" onClick={openAdd}>
            Add Transition
          </Button>
        </div>
      ) : null}

      {PROJECTS.map((project) => {
        const transitions = data?.[project] ?? []
        return (
          <div key={project} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-jscolors-text/40">{project.toUpperCase()}</h3>
            <div className={tableWrapCls}>
              <table className={tableCls}>
                <thead>
                  <tr className={theadRowCls}>
                    <th className={thCls}>From</th>
                    <th className={thCls}>To</th>
                    <th className={thCls}>Type</th>
                    {canWrite ? <th className={thCls}></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {transitions.map((transition) => {
                    const typeLabel = data?.transition_types.find((item) => item.id === transition.type_id)?.label ?? String(transition.type_id)
                    return (
                      <tr key={transition.id} className={tbodyRowCls}>
                        <td className={tdCls}>{transition.from_label}</td>
                        <td className={tdCls}>{transition.to_label}</td>
                        <td className={tdCls}>{typeLabel}</td>
                        {canWrite ? (
                          <td className={tdCls}>
                            <Button variant="danger" size="sm" className="bg-white py-1.5 font-semibold hover:bg-red-50" onClick={() => handleRemove(project, transition.id)}>
                              Remove
                            </Button>
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                  {transitions.length === 0 ? (
                    <tr>
                      <td colSpan={canWrite ? 4 : 3} className="px-5 py-4 text-center text-sm text-jscolors-text/50">
                        No transitions for {project.toUpperCase()}.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
