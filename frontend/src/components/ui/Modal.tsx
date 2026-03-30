import { useEffect } from "react"
import { createPortal } from "react-dom"

import Button from "./Button"

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
  submitLabel: string
  onSubmit: () => void
  submitVariant?: "primary" | "danger"
  isSubmitting?: boolean
}

export default function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  children,
  submitLabel,
  onSubmit,
  submitVariant = "primary",
  isSubmitting = false,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxW = size === "sm" ? "max-w-sm" : size === "md" ? "max-w-md" : "max-w-2xl"

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
      className="flex items-center justify-center bg-jscolors-text/35 px-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10000 }}
        className={`glass-panel flex flex-col w-full ${maxW} max-h-[90vh]`}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="font-syne text-2xl font-semibold text-jscolors-crimson">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-jscolors-text/40 transition hover:bg-jscolors-crimson/10 hover:text-jscolors-crimson"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
          {children}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 pt-4 pb-6">
          <Button
            type="button"
            variant={submitVariant}
            className="w-full"
            disabled={isSubmitting}
            onClick={onSubmit}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
