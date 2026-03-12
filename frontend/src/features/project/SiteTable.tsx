import { useParams } from "react-router-dom"
import { useMemo } from "react"
import CellRenderer from "./CellRenderer"

export default function SiteTable({
  siteList,
  reload,
  fieldPermissions,
  columns
}: any) {

  const { projectCode } = useParams()

  const sites = siteList || []

  const fields = useMemo(() => {

    if (!columns) return []

    return columns
      .filter((c: any) =>
        !["id", "project_id"].includes(c.column_name)
      )
      .map((c: any) => ({
        column_name: c.column_name,
        label: c.label || c.column_name,
        isBadge: c.is_badge === true
      }))

  }, [columns])

  return (
    <table border={1} cellPadding={6}>

      <thead>
        <tr>
          {fields.map((f: any) => (
            <th key={f.column_name}>{f.label}</th>
          ))}
        </tr>
      </thead>

      <tbody>

        {sites.map((site: any) => (
          <tr key={site.id}>

            {fields.map((f: any) => (
              <td key={f.column_name}>
                <CellRenderer
                  row={site}
                  field={f}
                  entity="site"
                  isBadge={f.isBadge}
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