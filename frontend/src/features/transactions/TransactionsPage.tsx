import ListPageLayout from "../../components/layout/ListPageLayout"
import TransactionsTable from "./components/TransactionsTable"
import useTransactionsPage from "./hooks/useTransactionsPage"

export default function TransactionsPage() {
  const { rows, badgeById, loading, error, page, setPage, pagination } = useTransactionsPage()

  if (loading && rows.length === 0) {
    return <div className="p-6 text-jscolors-text/50">Loading transactions...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <ListPageLayout pagination={pagination} onPageChange={setPage}>
      <TransactionsTable rows={rows} badgeById={badgeById} />
    </ListPageLayout>
  )
}
