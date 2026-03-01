import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { api } from "../../lib/api"
import BadgeSelectCell from "./components/BadgeSelectCell"
import DocBadgeSelectCell from "./components/DocBadgeSelectCell"
import FeFinancePanel from "./components/FeFinancePanel"

export default function SiteTable({ projectId, reload }: { projectId: number, reload: () => void }) {
  const { projectCode } = useParams()
  const [sites, setSites] = useState<any[]>([])

  const fetchSites = async () => {
    const res = await api.get(`/mi/${projectId}`)
    setSites(res.data.data)
  }

  useEffect(() => {
    fetchSites()
  }, [projectId])

  return (
    <table border={1} cellPadding={6}>
      <thead>
        <tr>
          <th>CKT ID</th>
          <th>Customer</th>
          <th>Height</th>
          <th>Receiving Date</th>
          <th>Permission Date</th>
          <th>Completion Date</th>
          <th>Status</th>
          <th>PO Status</th>
          <th>Invoice Status</th>
          <th>WCC</th>
          <th>FE</th>
        </tr>
      </thead>
      <tbody>
        {sites.map(site => (
          <tr key={site.id}>
            <td>
              <Link to={`/${projectCode}/site/${site.id}/details`}>
                {site.ckt_id}
              </Link>
            </td>
            <td>{site.customer}</td>
            <td>{site.height_m}</td>
            <td>{site.receiving_date}</td>
            <td>{site.permission_date}</td>
            <td>{site.completion_date}</td>
            <td>
              <BadgeSelectCell
                site={site}
                field="status_badge_id"
                type="status"
                reload={reload}
              />
            </td>
            <td>
              <DocBadgeSelectCell
                site={site}
                field="po_status_badge_id"
                entityTypeId={4}
                reload={reload}
                canToggle={true}
              />
            </td>
            <td>
              <DocBadgeSelectCell
                site={site}
                field="invoice_status_badge_id"
                entityTypeId={3}
                reload={reload}
                canToggle={true}
              />
            </td>
            <td>
              <DocBadgeSelectCell
                site={site}
                field="wcc_badge_id"
                entityTypeId={5}
                reload={reload}
                canToggle={true}
              />
            </td>
            <td>
              <FeFinancePanel site={site} onUpdated={fetchSites} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
