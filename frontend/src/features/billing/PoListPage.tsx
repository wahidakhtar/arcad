import { useEffect } from "react"

import DataTable from "../../components/ui/DataTable"
import FilterBar from "../../components/ui/FilterBar"
import ListPageLayout from "../../components/layout/ListPageLayout"
import { subscribe } from "../../hooks/useWebSocket"
import { useListPage } from "../../hooks/useListPage"
import FieldRenderer from "../../components/ui/FieldRenderer"
import { poCircuitContext, poProjectName } from "./poHelpers"
import type { PO } from "./types"

export default function PoListPage() {
  const { data, loading, error, refetch } = useListPage<PO[]>({
    endpoint: "/billing/pos",
  })

  useEffect(() => {
    const unsub1 = subscribe("PO_CREATED", () => { void refetch() })
    const unsub2 = subscribe("PO_UPDATED", () => { void refetch() })
    const unsub3 = subscribe("INVOICE_UPDATED", () => { void refetch() })
    return () => { unsub1(); unsub2(); unsub3() }
  }, [refetch])

  const rows = [...(data ?? [])].sort((a, b) => b.id - a.id)
  const tableRows = rows.map((row) => ({
    ...row,
    project_name: poProjectName(row),
    circuit_context: poCircuitContext(row),
  }))

  if (loading) {
    return <div className="p-6 text-jscolors-text/50">Loading purchase orders...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <ListPageLayout filters={<FilterBar filters={[]} onFilterChange={() => {}} />}>
      <DataTable
        columns={[
          { key: "project_name", label: "Project", minWidth: 180 },
          { key: "circuit_context", label: "Circuit ID", minWidth: 180 },
          { key: "po_no", label: "PO Number", minWidth: 220 },
          { key: "po_status", label: "PO Status", type: "badge", minWidth: 180 },
          {
            key: "invoice_status",
            label: "Invoice Status",
            minWidth: 180,
            render: (value) => value ? <FieldRenderer type="badge" value={value} /> : "-",
          },
        ]}
        rows={tableRows}
        rowHref={(row) => `/billing/po/${row.id}`}
      />
    </ListPageLayout>
  )
}
