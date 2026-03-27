import { useCallback, useEffect, useRef } from "react"

// ─── Event types ────────────────────────────────────────────────────────────

export type WsEvent =
  | { type: "TRANSACTION_CREATED" }
  | { type: "TRANSACTION_UPDATED"; transaction_id: number }
  | { type: "TICKET_CREATED"; ticket_id: number }
  | { type: "TICKET_CLOSED"; ticket_id: number; site_id: number | null }
  | { type: "SITE_CREATED"; site_id: number; project_key: string }
  | { type: "SITE_UPDATED"; site_id: number; project_key: string }
  | { type: "PO_CREATED" }
  | { type: "PO_UPDATED"; po_id: number }
  | { type: "INVOICE_CREATED"; po_id: number | null }
  | { type: "INVOICE_UPDATED"; po_id: number | null }

type WsHandler = (event: WsEvent) => void

// ─── Module-level event bus (singleton) ─────────────────────────────────────

const _listeners = new Map<string, Set<WsHandler>>()

export function subscribe(eventType: string, handler: WsHandler): () => void {
  if (!_listeners.has(eventType)) _listeners.set(eventType, new Set())
  _listeners.get(eventType)!.add(handler)
  return () => {
    _listeners.get(eventType)?.delete(handler)
  }
}

function _publish(event: WsEvent) {
  _listeners.get(event.type)?.forEach((fn) => {
    try {
      fn(event)
    } catch {
      // never let one bad handler break others
    }
  })
}

// ─── Derive WS URL from API URL ──────────────────────────────────────────────

function getWsUrl(): string {
  const apiUrl =
    (import.meta.env.VITE_API_URL as string | undefined) ||
    "https://arcad-production.up.railway.app/api/v1"
  return apiUrl.replace(/^https?/, (m) => (m === "https" ? "wss" : "ws")) + "/ws"
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    const token = localStorage.getItem("access_token")
    if (!token) return

    const ws = new WebSocket(getWsUrl())
    wsRef.current = ws

    ws.onopen = () => {
      // Keep-alive ping every 25s to survive proxy idle timeouts
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping")
      }, 25_000)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as WsEvent
        _publish(data)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current)
      wsRef.current = null
      if (mountedRef.current) {
        reconnectRef.current = setTimeout(connect, 3_000)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (pingRef.current) clearInterval(pingRef.current)
      wsRef.current?.close()
    }
  }, [connect])
}
