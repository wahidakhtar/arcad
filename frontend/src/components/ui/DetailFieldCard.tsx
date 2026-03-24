import Button from "./Button"

export default function DetailFieldCard({
  label,
  value,
  onEdit,
  onAdd,
}: {
  label: string
  value: React.ReactNode
  onEdit?: () => void
  onAdd?: () => void
}) {
  return (
    <div className="rounded-[22px] border border-jscolors-crimson/10 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-jscolors-text/40">{label}</div>
        {onEdit ? (
          <Button variant="ghost" size="sm" className="shrink-0 px-2.5 py-0.5 text-[10px]" onClick={onEdit}>
            Edit
          </Button>
        ) : null}
        {!onEdit && onAdd ? (
          <Button variant="ghost" size="sm" className="shrink-0 px-2.5 py-0.5 text-[10px]" onClick={onAdd}>
            Add
          </Button>
        ) : null}
      </div>
      <div className="mt-3 text-sm text-jscolors-text">{value}</div>
    </div>
  )
}
