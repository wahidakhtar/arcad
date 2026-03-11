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

  // -----------------------------
  // SITE DETAIL LINK
  // -----------------------------
  if(entity === "site" && key === "ckt_id"){

    if(value == null) return "-"

    const canEdit = permissions?.ckt_id?.edit

    if(canEdit){
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

    const canEdit = permissions?.name?.edit ?? true

    if(canEdit){
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

    const entityMap:any = {
      status_badge_id: 2,
      wcc: 5
    }

    const entityTypeId = entityMap[key]

    return(
      <BadgeCell
        site={row}
        field={key}
        entityTypeId={entityTypeId}
        reload={refresh}
      />
    )
  }

  return value ?? "-"
}