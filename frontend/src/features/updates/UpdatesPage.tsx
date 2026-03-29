import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import DataTable from "../../components/ui/DataTable"
import ListPageLayout from "../../components/layout/ListPageLayout"
import { api } from "../../lib/api"

export default function UpdatesPage() {
  const { siteId = "0" } = useParams()
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])

  useEffect(() => {
    void api.get(`/updates?site_id=${siteId}`).then((response) => setRows(response.data))
  }, [siteId])

  return (
    <ListPageLayout title="Site update log">
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
    </ListPageLayout>
  )
}
