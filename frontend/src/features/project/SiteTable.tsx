import { useParams } from "react-router-dom"
import CellRenderer from "./CellRenderer"

const badgeFields = ["status_badge_id","wcc"]

export default function SiteTable({ siteList, reload, fieldPermissions, columns }: any){

  const { projectCode } = useParams()

  const sites = siteList || []

  const fields = (columns || [])
    .filter((c:any)=>!["id","project_id"].includes(c.column_name))
    .map((c:any)=>({
      column_name: c.column_name,
      label: c.label || c.column_name
    }))

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
                  row={site}
                  field={f}
                  entity="site"
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