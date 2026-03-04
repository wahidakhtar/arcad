import { useParams } from "react-router-dom"
import { useOutletContext } from "react-router-dom"
import { useMiSites } from "./hooks/useMiSites"
import SiteTable from "./SiteTable"
import AddSiteModal from "./AddSiteModal"

const PROJECT_LABELS: Record<string, string> = {
  mi: "Mast Installation",
  md: "Mast Dismantle",
  ma: "Mast Audit",
  mc: "Mast CM",
  bb: "BB",
}

export default function ProjectPage() {

  const { projectCode } = useParams()
  const { showModal, setShowModal } = useOutletContext<any>()

  const { siteList, fieldPermissions, columns, reload } = useMiSites(projectCode)

  if (!projectCode) return null

  return (
    <div>

      <h2>{PROJECT_LABELS[projectCode] || projectCode}</h2>

      {showModal && (
        <AddSiteModal
          project_id={projectCode}
          onClose={() => setShowModal(false)}
          onCreated={reload}
        />
      )}

      <SiteTable
        siteList={siteList}
        reload={reload}
        fieldPermissions={fieldPermissions}
        columns={columns}
      />

    </div>
  )
}
