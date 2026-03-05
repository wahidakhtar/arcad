import { useParams } from "react-router-dom"

import MiSiteDetailsPage from "./mi/MiSiteDetailsPage"
import MaSiteDetailsPage from "./ma/MaSiteDetailsPage"
import McSiteDetailsPage from "./mc/McSiteDetailsPage"
import MdSiteDetailsPage from "./md/MdSiteDetailsPage"
import BbSiteDetailsPage from "./bb/BbSiteDetailsPage"

export default function ProjectSiteDetailsRouter(){

  const { projectCode } = useParams()

  if(projectCode==="mi") return <MiSiteDetailsPage />
  if(projectCode==="ma") return <MaSiteDetailsPage />
  if(projectCode==="mc") return <McSiteDetailsPage />
  if(projectCode==="md") return <MdSiteDetailsPage />
  if(projectCode==="bb") return <BbSiteDetailsPage />

  return <div>No detail page defined for project: {projectCode}</div>
}
