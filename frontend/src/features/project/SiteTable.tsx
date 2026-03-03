import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "../../lib/api"
import BadgeSelectCell from "./components/BadgeSelectCell"
import DocBadgeSelectCell from "./components/DocBadgeSelectCell"
import FeFinancePanel from "./components/FeFinancePanel"

export default function SiteTable() {
  const { projectCode } = useParams()
  const [sites, setSites] = useState<any[]>([])
  const [capabilities, setCapabilities] = useState<any>({})

  const fetchSites = async () => {
    const projectRes = await api.get("/project/my")
    const projectId = projectRes.data[0]?.id
    if (!projectId) return
    const res = await api.get(`/${projectCode}/${projectId}`)
    setSites(res.data.data || [])
    setCapabilities(res.data.capabilities || {})
  }

  useEffect(() => {
    fetchSites()
  }, [projectCode])

  const renderCell = (key: string, value: any, site: any) => {
    if (key === "status_badge_id") {
      if (capabilities.toggle_status) {
        return (
          <BadgeSelectCell
            site={site}
            field="status_badge_id"
            type="status"
            reload={fetchSites}
          />
        )
      }
      return value
    }

    if (key === "po_status_badge_id" && capabilities.toggle_po) {
      return (
        <DocBadgeSelectCell
          site={site}
          field="po_status_badge_id"
          entityTypeId={4}
          reload={fetchSites}
          canToggle={true}
        />
      )
    }

    if (key === "invoice_status_badge_id" && capabilities.toggle_invoice) {
      return (
        <DocBadgeSelectCell
          site={site}
          field="invoice_status_badge_id"
          entityTypeId={3}
          reload={fetchSites}
          canToggle={true}
        />
      )
    }

    if (key === "wcc" && capabilities.toggle_wcc) {
      return (
        <DocBadgeSelectCell
          site={site}
          field="wcc"
          entityTypeId={5}
          reload={fetchSites}
          canToggle={true}
        />
      )
    }

    if (key === "fe") {
      return <FeFinancePanel site={site} onUpdated={fetchSites} />
    }

    return value ?? "-"
  }

  return (
    <table border={1} cellPadding={6}>
      <thead>
        <tr>
          {sites.length > 0 &&
            Object.keys(sites[0]).map((key) => (
              <th key={key}>{key}</th>
            ))}
        </tr>
      </thead>
      <tbody>
        {sites.map(site => (
          <tr key={site.id}>
            {Object.entries(site).map(([key, value]) => (
              <td key={key}>
                {renderCell(key, value, site)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
