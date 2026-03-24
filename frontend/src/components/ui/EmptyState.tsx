export default function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-jscolors-crimson/18 bg-jscolors-crimson/[0.03] px-4 py-4 text-sm text-jscolors-text/60">
      {text}
    </div>
  )
}
