import DataTable from "../../components/ui/DataTable"
import ListPageLayout from "../../components/layout/ListPageLayout"
import useTicketsPage from "./hooks/useTicketsPage"

export default function TicketsPage() {
  const { rows, loading, error, page: _page, setPage, pagination } = useTicketsPage()

  if (loading && rows.length === 0) {
    return <div className="p-6 text-jscolors-text/50">Loading tickets...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <ListPageLayout pagination={pagination} onPageChange={setPage}>
      <DataTable
        columns={[
          { key: "ticket_ref", label: "Ticket Number" },
          { key: "project_label", label: "Project" },
          { key: "ckt_id", label: "Site" },
          { key: "ticket_date", label: "Date" },
          {
            key: "status",
            label: "Status",
            render: (value) => {
              const isOpen = value === "Open"
              return (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isOpen ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {value as string}
                </span>
              )
            },
          },
        ]}
        rows={rows}
        rowHref={(row) => `/tickets/${(row as unknown as { id: number }).id}`}
      />
    </ListPageLayout>
  )
}
