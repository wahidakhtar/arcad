import { createPortal } from "react-dom"

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

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
      className="flex items-center justify-center bg-jscolors-text/35 px-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10000 }}
        className="glass-panel w-full max-w-2xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">{title}</h2>
          <button type="button" onClick={onClose} className="premium-button-secondary">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
