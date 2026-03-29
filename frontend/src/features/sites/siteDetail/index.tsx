import DetailPageLayout from "../../../components/layout/DetailPageLayout"
import Button from "../../../components/ui/Button"
import FieldRenderer from "../../../components/ui/FieldRenderer"
import Modal from "../../../components/ui/Modal"
import { useAuth } from "../../../context/AuthContext"
import { optionsForField } from "../siteDetailHelpers"
import SiteFEAssignmentSection from "../SiteFEAssignmentSection"
import SiteTicketsSection from "../SiteTicketsSection"
import SiteUpdatesSection from "../SiteUpdatesSection"
import SiteFieldsSection from "./components/SiteFieldsSection"
import SiteHeader from "./components/SiteHeader"
import useSiteDetail from "./hooks/useSiteDetail"

export default function SiteDetailPage() {
  const { can } = useAuth()
  const {
    projectKey,
    site,
    loading,
    error,
    states,
    project,
    updates,
    tickets,
    transactions,
    subcons,
    jobBuckets,
    transactionTypes,
    badges,
    transitions,
    badgeById,
    stateById,
    badgeFields,
    regularFields,
    editingField,
    editSaving,
    editError,
    updatingBadgeKey,
    isAssetTransfer,
    openFieldEditor,
    setEditingField,
    setEditError,
    saveFieldEdit,
    transitionBadge,
    loadPage,
  } = useSiteDetail()

  if (loading) return <div className="p-6 text-jscolors-text/50">Loading site details...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!site) return <div className="p-6 text-jscolors-text/50">Site not found.</div>

  const canSiteWrite = can("site", "write")
  const canRequestWrite = can("request", "write")
  const canTransactionWrite = can("transaction", "write")
  const canAddUpdate = can("update", "write") || can("acc_update", "write")
  const canReadOpsUpdates = can("update", "read")
  const canReadAccUpdates = can("acc_update", "read")
  const cancelBadgeId = badges.find((badge) => badge.key === "cancel")?.id
  const reqBadgeId = badges.find((badge) => badge.key === "req")?.id

  return (
    <DetailPageLayout
      backHref={`/projects/${projectKey}`}
      badges={
        <SiteHeader
          site={site}
          badgeFields={badgeFields}
          badgeById={badgeById}
          transitions={transitions}
          updatingBadgeKey={updatingBadgeKey}
          docBadgeEditable={can("doc_badge", "write")}
          isAssetTransfer={isAssetTransfer}
          onTransition={(fieldKey, toId) => void transitionBadge(fieldKey, toId)}
        />
      }
    >
      <div className="space-y-6">
        <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
          <SiteFieldsSection
            site={site}
            fields={regularFields}
            badgeById={badgeById}
            stateById={stateById}
            canSiteWrite={canSiteWrite}
            onOpenField={(field) => {
              openFieldEditor(field)
              setEditError("")
            }}
          />
        </div>

        <Modal open={editingField !== null} title={editingField?.field.label ?? "Edit"} onClose={() => setEditingField(null)} size="sm">
          {editingField ? (
            <div className="space-y-4">
              <FieldRenderer
                mode="input"
                field={{ ...editingField.field, options: optionsForField(editingField.field, states) }}
                value={editingField.draft}
                onChange={(value) => setEditingField((current) => (current ? { ...current, draft: value } : null))}
              />
              {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
              <div className="flex gap-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setEditingField(null)}>
                  Cancel
                </Button>
                <Button type="button" className="flex-1" disabled={editSaving} onClick={() => void saveFieldEdit()}>
                  {editSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>

        <section className="grid gap-6">
          <SiteUpdatesSection
            updates={updates}
            canReadOpsUpdates={canReadOpsUpdates}
            canReadAccUpdates={canReadAccUpdates}
            canAddUpdate={canAddUpdate}
            projectId={project?.id}
            siteId={site.id}
            onReload={loadPage}
          />
          <SiteTicketsSection
            tickets={tickets}
            canTicketRead={can("ticket", "read")}
            canTicketWrite={can("ticket", "write")}
            projectId={project?.id}
            siteId={site.id}
            onReload={loadPage}
          />
          <SiteFEAssignmentSection
            currentSite={site}
            projectKey={projectKey}
            project={project}
            jobBuckets={jobBuckets}
            subcons={subcons}
            transactions={transactions}
            badgeById={badgeById}
            transactionTypes={transactionTypes}
            transitions={transitions}
            reqBadgeId={reqBadgeId}
            cancelBadgeId={cancelBadgeId}
            canRequestWrite={canRequestWrite}
            canTransactionWrite={canTransactionWrite}
            canSiteWrite={canSiteWrite}
            onReload={loadPage}
          />
        </section>
      </div>
    </DetailPageLayout>
  )
}
