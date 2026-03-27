import DataTable from "../../components/ui/DataTable"
import useTicketsPage from "./hooks/useTicketsPage"

export default function TicketsPage() {
  const { rows, loading, error } = useTicketsPage()

  if (loading) {
    return <div className="p-6 text-jscolors-text/50">Loading tickets...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <div className="space-y-6">
      <DataTable
        columns={[
          { key: "ticket_ref", label: "Ticket Number" },
          { key: "project_label", label: "Project" },
          { key: "ckt_id", label: "Site" },
          { key: "ticket_date", label: "Date" },
          {
            key: "status",
            label: "Status",
            render: () => (
              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700">
                Open
              </span>
            ),
          },
        ]}
        rows={rows}
        rowHref={(row) => `/tickets/${(row as unknown as { id: number }).id}`}
      />
    </div>
  )
}
