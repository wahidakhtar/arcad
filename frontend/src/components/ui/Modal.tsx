export default function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-jscolors-text/35 px-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">{title}</h2>
          <button type="button" onClick={onClose} className="premium-button-secondary">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
