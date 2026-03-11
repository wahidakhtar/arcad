import { useParams, useOutletContext } from "react-router-dom"
import { useEffect } from "react"
import { useMiSites } from "./hooks/useMiSites"
import SiteTable from "./SiteTable"
import AddModal from "../../common/AddModal"

const PROJECT_LABELS: Record<string, string> = {
  mi: "Mast Installation",
  md: "Mast Dismantle",
  ma: "Mast Audit",
  mc: "Mast CM",
  bb: "Broadband",
}

export default function ProjectPage() {

  const { projectCode } = useParams()

  const {
    showModal,
    modalType,
    setShowModal,
    setCanAddSite
  } = useOutletContext<any>()

  const {
    siteList,
    fieldPermissions,
    columns,
    canAddSite,
    reload
  } = useMiSites(projectCode)

  useEffect(() => {
    setCanAddSite(canAddSite)
  }, [canAddSite, setCanAddSite])

  if (!projectCode) return null

  return (
    <div>

      <h2>{PROJECT_LABELS[projectCode] || projectCode}</h2>

      {showModal && modalType === "site" && (
        <AddModal
          entity="site"
          context={{ project_code: projectCode }}
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