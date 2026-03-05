import { Link } from "react-router-dom"
import BadgeCell from "../../components/BadgeCell"

export default function CellRenderer({
  site,
  field,
  isBadge,
  refresh,
  projectCode,
  permissions
}: any){

  const key = field.column_name
  const value = site[key]

  if(key === "ckt_id"){
    if(value == null) return "-"

    const canEdit = permissions?.ckt_id?.edit

    if(canEdit){
      return (
        <Link to={`/${projectCode}/site/${site.id}/details`}>
          {value}
        </Link>
      )
    }

    return value
  }

  if(isBadge){

    const entityMap:any = {
      status_badge_id: 2,
      wcc: 5
    }

    const entityTypeId = entityMap[key]

    return(
      <BadgeCell
        site={site}
        field={key}
        entityTypeId={entityTypeId}
        reload={refresh}
      />
    )
  }

  return value ?? "-"
}
