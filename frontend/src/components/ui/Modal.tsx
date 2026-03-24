import { createPortal } from "react-dom"

import Button from "./Button"

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "lg",
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg"
}) {
  if (!open) return null

  const maxW = size === "sm" ? "max-w-sm" : size === "md" ? "max-w-md" : "max-w-2xl"

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
      className="flex items-center justify-center bg-jscolors-text/35 px-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10000 }}
        className={`glass-panel w-full ${maxW} p-6`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">{title}</h2>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
