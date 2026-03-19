import { useEffect, useState } from "react"

import DataTable from "../../components/ui/DataTable"
import { api } from "../../lib/api"

type TxRaw = {
  id: number
  project_id: number
  site_id: number
  amount: number | string
  status_id: number
}

type ProjectEntry = {
  id: number
  key: string
  label: string
}

type BadgeEntry = {
  id: number
  label: string
}

type SiteEntry = {
  id: number
  ckt_id: string
}

type TxRow = Record<string, unknown> & {
  id: number
  project_label: string
  ckt_id: string
  amount: number | string
  status_label: string
}

export default function TransactionsPage() {
  const [rows, setRows] = useState<TxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const [txResponse, projectsResponse, badgesResponse] = await Promise.all([
          api.get<TxRaw[]>("/transactions"),
          api.get<ProjectEntry[]>("/projects"),
          api.get<BadgeEntry[]>("/badges"),
        ])

        if (cancelled) return

        const transactions: TxRaw[] = txResponse.data ?? []
        const projects: ProjectEntry[] = Array.isArray(projectsResponse.data) ? projectsResponse.data : []
        const badges: BadgeEntry[] = Array.isArray(badgesResponse.data) ? badgesResponse.data : []

        const projectById = new Map(projects.map((p) => [p.id, p]))
        const badgeById = new Map(badges.map((b) => [b.id, b.label]))

        // collect unique project keys referenced by transactions
        const projectKeysNeeded = new Set<string>()
        for (const tx of transactions) {
          const proj = projectById.get(tx.project_id)
          if (proj) projectKeysNeeded.add(proj.key)
        }

        // fetch site list per project key to resolve site_id → ckt_id
        const siteMap = new Map<string, string>() // `${project_key}:${site_id}` → ckt_id
        await Promise.all(
          [...projectKeysNeeded].map(async (key) => {
            try {
              const res = await api.get<SiteEntry[]>(`/sites/${key}`)
              const sites: SiteEntry[] = Array.isArray(res.data) ? res.data : []
              for (const site of sites) {
                siteMap.set(`${key}:${site.id}`, site.ckt_id ?? String(site.id))
              }
            } catch {
              // fall back to raw site_id for this project
            }
          }),
        )

        if (cancelled) return

        const displayRows: TxRow[] = transactions.map((tx) => {
          const proj = projectById.get(tx.project_id)
          const cktKey = proj ? `${proj.key}:${tx.site_id}` : ""
          return {
            id: tx.id,
            project_label: proj?.label ?? String(tx.project_id),
            ckt_id: siteMap.get(cktKey) ?? String(tx.site_id),
            amount: tx.amount,
            status_label: badgeById.get(tx.status_id) ?? String(tx.status_id),
          }
        })

        setRows(displayRows)
      } catch (err: unknown) {
        if (!cancelled) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          setError(detail ?? "Unable to load transactions.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div className="glass-panel p-6">Loading transactions...</div>
  }

  if (error) {
    return <div className="glass-panel p-6 text-red-700">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">Transactions</p>
        <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">Requested, executed, cancelled, and rejected finance flow</h1>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "project_label", label: "Project" },
          { key: "ckt_id", label: "Site" },
          { key: "amount", label: "Amount" },
          { key: "status_label", label: "Status" },
        ]}
        rows={rows}
      />
    </div>
  )
}
