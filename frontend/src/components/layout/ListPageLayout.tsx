import Pagination from "../ui/Pagination"
import type { PaginationState } from "../../hooks/useListPage"

type ListPageLayoutProps = {
  title?: string
  actions?: React.ReactNode
  filters?: React.ReactNode
  pagination?: PaginationState | null
  onPageChange?: (page: number) => void
  children: React.ReactNode
}

export default function ListPageLayout({ title, actions, filters, pagination, onPageChange, children }: ListPageLayoutProps) {
  return (
    <div className="flex h-full flex-col gap-0">
      {(title || actions || filters) && (
        <div className="shrink-0 space-y-4 pb-5">
          {(title || actions) && (
            <div className="flex items-center justify-between gap-3">
              {title ? <h1 className="font-syne text-2xl font-semibold text-jscolors-crimson">{title}</h1> : <span />}
              {actions && <div className="shrink-0">{actions}</div>}
            </div>
          )}
          {filters}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-auto">
        {children}
      </div>
      {pagination && onPageChange ? (
        <div className="shrink-0 rounded-b-[24px] border-t border-jscolors-crimson/10 bg-white">
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onChange={onPageChange}
          />
        </div>
      ) : null}
    </div>
  )
}
