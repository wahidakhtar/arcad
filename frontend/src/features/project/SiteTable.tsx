import { useParams } from "react-router-dom"
import useBadgeTransitions from "./useBadgeTransitions"
import CellRenderer from "./CellRenderer"

const badgeFields = ["status_badge_id","wcc"]

export default function SiteTable({ siteList, reload, fieldPermissions }: any){

  const { projectCode } = useParams()

  const sites = siteList || []

  const fields = sites.length
    ? Object.keys(sites[0]).map(k => ({
        column_name: k,
        label: k
      }))
    : []

  const {badgeMap,transitions}=useBadgeTransitions(
    sites,
    projectCode
  )

  return(
    <table border={1} cellPadding={6}>

      <thead>
        <tr>
          {fields.map((f:any)=>(
            <th key={f.column_name}>{f.label}</th>
          ))}
        </tr>
      </thead>

      <tbody>

        {sites.map((site:any)=>(
          <tr key={site.id}>

            {fields.map((f:any)=>(
              <td key={f.column_name}>
                <CellRenderer
                  site={site}
                  field={f}
                  badgeMap={badgeMap}
                  transitions={transitions}
                  isBadge={badgeFields.includes(f.column_name)}
                  refresh={reload}
                  projectCode={projectCode}
                  permissions={fieldPermissions}
                />
              </td>
            ))}

          </tr>
        ))}

      </tbody>

    </table>
  )
}
