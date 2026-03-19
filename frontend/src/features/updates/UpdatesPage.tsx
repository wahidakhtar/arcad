import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import DataTable from "../../components/ui/DataTable"
import { api } from "../../lib/api"

export default function UpdatesPage() {
  const { siteId = "0" } = useParams()
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])

  useEffect(() => {
    void api.get(`/updates?site_id=${siteId}`).then((response) => setRows(response.data))
  }, [siteId])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">Updates</p>
        <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">Site update log</h1>
      </div>
      <DataTable
        columns={[
          { key: "date", label: "Date" },
          { key: "update", label: "Update" },
          { key: "followup_date", label: "Follow-up Date" },
          { key: "project_id", label: "Project" },
          { key: "site_id", label: "Site" },
        ]}
        rows={rows}
      />
    </div>
  )
}
