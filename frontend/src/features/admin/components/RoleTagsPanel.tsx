import { useAuth } from "../../../context/AuthContext"
import { tbodyRowCls, tdCls, thCls, theadRowCls } from "../constants"
import useRoleTags from "../hooks/useRoleTags"

export default function RoleTagsPanel() {
  const { can } = useAuth()
  const canWrite = can("admin", "write")
  const { data, matrix, saving, error, handleToggle } = useRoleTags()

  const roles = data?.roles ?? []
  const tags = data?.tags ?? []

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr className={theadRowCls}>
              <th className={thCls} style={{ minWidth: 140 }}>Role</th>
              {tags.map((tag) => (
                <th key={tag.id} className={thCls} style={{ minWidth: 80, textAlign: "center" }}>
                  {tag.tag}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className={tbodyRowCls}>
                <td className={tdCls} style={{ minWidth: 140 }}>{role.label}</td>
                {tags.map((tag) => {
                  const key = `${role.id}:${tag.id}`
                  const permission = matrix[key] ?? { read: false, write: false }

                  return (
                    <td key={tag.id} className={tdCls} style={{ minWidth: 80, textAlign: "center" }}>
                      <div className="flex flex-col gap-1 items-center">
                        <label className="flex items-center gap-1 text-xs text-jscolors-text/60">
                          <input
                            type="checkbox"
                            checked={permission.read}
                            onChange={() => handleToggle(role.id, tag.id, "read", !permission.read)}
                            className="h-3 w-3"
                            disabled={!canWrite || saving.has(key)}
                          />
                          R
                        </label>
                        <label className="flex items-center gap-1 text-xs text-jscolors-text/60">
                          <input
                            type="checkbox"
                            checked={permission.write}
                            onChange={() => handleToggle(role.id, tag.id, "write", !permission.write)}
                            className="h-3 w-3"
                            disabled={!canWrite || saving.has(key)}
                          />
                          W
                        </label>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
            {roles.length === 0 ? (
              <tr>
                <td colSpan={tags.length + 1} className="px-5 py-6 text-center text-sm text-jscolors-text/50">
                  No roles configured.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
