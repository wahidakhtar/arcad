import { Link } from "react-router-dom"
import BadgeCell from "../../components/BadgeCell"

export default function CellRenderer({
  row,
  field,
  isBadge,
  refresh,
  entity,
  projectCode,
  permissions
}: any){

  const key = field.column_name
  const value = row[key]

  const fieldPerm = permissions?.[key] || {}

  // -----------------------------
  // SITE DETAIL LINK
  // -----------------------------
  if(entity === "site" && key === "ckt_id"){

    if(value == null) return "-"

    const canView = fieldPerm.view

    if(canView){
      return (
        <Link to={`/${projectCode}/site/${row.id}/details`}>
          {value}
        </Link>
      )
    }

    return value
  }

  // -----------------------------
  // USER DETAIL LINK
  // -----------------------------
  if(entity === "user" && key === "name"){

    if(value == null) return "-"

    const canView = fieldPerm.view ?? true

    if(canView){
      return (
        <Link to={`/people/${row.id}`}>
          {value}
        </Link>
      )
    }

    return value
  }

  // -----------------------------
  // BADGE CELLS
  // -----------------------------
  if(isBadge){

    return(
      <BadgeCell
        site={row}
        field={key}
        reload={refresh}
        permissions={permissions}
      />
    )
  }

  return value ?? "-"
}