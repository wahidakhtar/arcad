import { useEffect, useRef, useState } from "react"

import { useAuth } from "../../context/AuthContext"
import { subscribe } from "../../hooks/useWebSocket"

type ToastDetails = {
  project?: string
  amount?: number | null
  recipient?: string | null
  tx_type?: string | null
}

type Toast = { id: number; message: string; details?: ToastDetails }

export default function ToastNotification() {
  const { roles } = useAuth()
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  useEffect(() => {
    const deptKeys = new Set(roles.map((r) => r.dept_key))

    const unsub = subscribe("NOTIFICATION", (event) => {
      if (event.type !== "NOTIFICATION") return
      if (!deptKeys.has(event.dept_target)) return
      const id = ++nextId.current
      setToasts((prev) => [...prev, { id, message: event.message, details: event.details as ToastDetails | undefined }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
    })

    return unsub
  }, [roles])

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-6 top-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 shadow-lg"
          style={{ boxShadow: "0 8px 32px rgba(83,20,20,0.12)" }}
        >
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-jscolors-crimson" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-jscolors-text">{toast.message}</p>
            {toast.details && (
              <div className="mt-1 space-y-0.5">
                {toast.details.tx_type && (
                  <p className="text-xs text-jscolors-text/55">{toast.details.tx_type}</p>
                )}
                {toast.details.recipient && (
                  <p className="text-xs text-jscolors-text/55">{toast.details.recipient}</p>
                )}
                <div className="flex items-center gap-2">
                  {toast.details.project && (
                    <p className="text-xs text-jscolors-text/40">{toast.details.project}</p>
                  )}
                  {toast.details.amount != null && (
                    <p className="text-xs font-semibold tabular-nums text-jscolors-crimson/70">
                      ₹{toast.details.amount.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="mt-0.5 shrink-0 text-base leading-none text-jscolors-text/40 transition hover:text-jscolors-crimson"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
