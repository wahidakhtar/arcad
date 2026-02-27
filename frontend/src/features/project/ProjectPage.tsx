import { useState } from "react"
import { useParams, useOutletContext } from "react-router-dom"
import { useMiSites } from "./hooks/useMiSites"
import SiteTable from "./SiteTable"
import AddSiteModal from "./AddSiteModal"
import SiteDetail from "./SiteDetail"

export default function ProjectPage() {
  const { project_id } = useParams()
  const { showModal, setShowModal } = useOutletContext<any>()

  const { siteList, reload } = useMiSites(project_id)
  const [selectedSite, setSelectedSite] = useState<any | null>(null)

  return (
    <div>
      <h2>Mast Installation</h2>

      {showModal && project_id && (
        <AddSiteModal
          project_id={project_id}
          onClose={() => setShowModal(false)}
          onCreated={reload}
        />
      )}

      {selectedSite ? (
        <SiteDetail
          site={selectedSite}
          onBack={() => setSelectedSite(null)}
          onUpdated={reload}
        />
      ) : (
        <SiteTable siteList={siteList} onSelect={setSelectedSite} reload={reload} />
      )}
    </div>
  )
}
