import { useEffect, useRef, useState } from "react"

import { useAuth } from "../../context/AuthContext"
import { subscribe } from "../../hooks/useWebSocket"

type Toast = { id: number; message: string }

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
      setToasts((prev) => [...prev, { id, message: event.message }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
    })

    return unsub
  }, [roles])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-8 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 shadow-lg"
          style={{ boxShadow: "0 8px 32px rgba(83,20,20,0.12)" }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-jscolors-crimson" />
          <span className="text-sm text-jscolors-text">{toast.message}</span>
          <button
            type="button"
            className="ml-1 text-base leading-none text-jscolors-text/40 transition hover:text-jscolors-crimson"
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
