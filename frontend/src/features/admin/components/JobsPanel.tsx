import { Link } from "react-router-dom"

import Button from "../../../components/ui/Button"
import Modal from "../../../components/ui/Modal"
import { useAuth } from "../../../context/AuthContext"
import { SCALE_BY_OPTIONS, fieldCls, labelCls, tableCls, tableWrapCls, tbodyRowCls, tdCls, thCls, theadRowCls } from "../constants"
import useAdminJobs from "../hooks/useAdminJobs"

export default function JobsPanel() {
  const { can } = useAuth()
  const canWrite = can("admin", "write")
  const { jobs, editingJob, editDraft, setEditDraft, saving, error, modalError, openEdit, closeEdit, handleSave } = useAdminJobs()

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <Modal open={editingJob !== null} title="Edit Job" onClose={closeEdit} size="sm">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Label</label>
            <input type="text" value={editDraft.label} onChange={(e) => setEditDraft((draft) => ({ ...draft, label: e.target.value }))} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Scale By</label>
            <select value={editDraft.scale_by} onChange={(e) => setEditDraft((draft) => ({ ...draft, scale_by: e.target.value }))} className={fieldCls}>
              {SCALE_BY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          {modalError ? <p className="text-sm text-red-600">{modalError}</p> : null}
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </Modal>

      <div className={tableWrapCls}>
        <table className={tableCls}>
          <thead>
            <tr className={theadRowCls}>
              <th className={thCls}>Job Key</th>
              <th className={thCls}>Bucket</th>
              <th className={thCls}>Label</th>
              <th className={thCls}>Scale By</th>
              {canWrite ? <th className={thCls}></th> : null}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className={tbodyRowCls}>
                <td className={tdCls}>{job.job_key}</td>
                <td className={tdCls}>{job.bucket_label}</td>
                <td className={tdCls}>{job.label}</td>
                <td className={tdCls}>{job.scale_by}</td>
                {canWrite ? (
                  <td className={tdCls}>
                    <Button variant="ghost" size="sm" className="py-1.5" onClick={() => openEdit(job)}>
                      Edit
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 5 : 4} className="px-5 py-6 text-center text-sm text-jscolors-text/50">
                  No jobs configured.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-sm text-jscolors-text/50">
        Rates are managed on the{" "}
        <Link to="/billing/rate-card" className="text-jscolors-crimson underline underline-offset-2">
          Rate Card page
        </Link>
        .
      </div>
    </div>
  )
}
