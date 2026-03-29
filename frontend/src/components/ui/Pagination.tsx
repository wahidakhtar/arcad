import Button from "./Button"

type PaginationProps = {
  page: number
  pages: number
  total: number
  pageSize: number
  onChange: (page: number) => void
}

export default function Pagination({ page, pages, total, pageSize, onChange }: PaginationProps) {
  if (pages <= 1 && total <= pageSize) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const pageNumbers = buildPageNumbers(page, pages)

  return (
    <div className="flex items-center justify-between border-t border-jscolors-crimson/10 bg-white px-5 py-3">
      <span className="text-xs text-jscolors-text/50">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        {pageNumbers.map((item, i) =>
          item === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs text-jscolors-text/40">…</span>
          ) : (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={item === page ? "primary" : "ghost"}
              className="min-w-[32px]"
              onClick={() => onChange(item as number)}
            >
              {item}
            </Button>
          )
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={page >= pages}
          onClick={() => onChange(Math.min(pages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const result: (number | "…")[] = []
  const add = (n: number) => { if (!result.includes(n)) result.push(n) }
  add(1)
  if (current > 3) result.push("…")
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) add(p)
  if (current < total - 2) result.push("…")
  add(total)
  return result
}
