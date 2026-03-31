import { useState } from "react"

import DetailPageLayout from "../../../components/layout/DetailPageLayout"
import Button from "../../../components/ui/Button"
import FieldRenderer from "../../../components/ui/FieldRenderer"
import Modal from "../../../components/ui/Modal"
import { useAuth } from "../../../context/AuthContext"
import { api } from "../../../lib/api"
import { optionsForField } from "../siteDetailHelpers"
import SiteFEAssignmentSection from "../SiteFEAssignmentSection"
import SiteTicketsSection from "../SiteTicketsSection"
import SiteUpdatesSection from "../SiteUpdatesSection"
import SiteBillingSection from "./components/SiteBillingSection"
import SiteFieldsSection from "./components/SiteFieldsSection"
import SiteHeader from "./components/SiteHeader"
import SelectInput from "../../../components/ui/SelectInput"
import useSiteDetail from "./hooks/useSiteDetail"

export default function SiteDetailPage() {
  const { can, roles } = useAuth()
  const [visitOutcomeOpen, setVisitOutcomeOpen] = useState(false)
  const [visitDateDraft, setVisitDateDraft] = useState("")
  const [outcomeDraft, setOutcomeDraft] = useState("")
  const [visitOutcomeSaving, setVisitOutcomeSaving] = useState(false)
  const [visitOutcomeError, setVisitOutcomeError] = useState("")
  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState("")
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
    outcomes,
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
  const currentSite = site

  const canSiteWrite = can("site", "write")
  const canRequestWrite = can("request", "write")
  const canTransactionWrite = can("transaction", "write")
  const canAddUpdate = can("update", "write") || can("acc_update", "write")
  const canReadOpsUpdates = can("update", "read")
  const canReadAccUpdates = can("acc_update", "read")
  const cancelBadgeId = badges.find((badge) => badge.key === "cancel")?.id
  const reqBadgeId = badges.find((badge) => badge.key === "req")?.id
  const canDeployStagedSite = Boolean(
    project?.id && roles.some((role) => (
      ((role.dept_key === "ops" && role.level_key === "l3") || (role.dept_key === "mgmt" && (role.level_key === "l2" || role.level_key === "l3")))
        && (role.project_id === null || role.project_id === project.id)
    )),
  )
  const showDeployButton = canSiteWrite && canDeployStagedSite && site.status_key === "stage"

  function openVisitOutcomeEditor() {
    setVisitDateDraft((currentSite.fields.visit_date as string | null) ?? "")
    setOutcomeDraft(String((currentSite.fields.outcome_id as number | null) ?? ""))
    setVisitOutcomeError("")
    setVisitOutcomeOpen(true)
  }

  async function saveVisitOutcome() {
    if (!visitDateDraft || !outcomeDraft.trim()) {
      setVisitOutcomeError("Visit Date and Outcome are both required.")
      return
    }
    setVisitOutcomeSaving(true)
    setVisitOutcomeError("")
    try {
      await api.patch(`/sites/${projectKey}/${currentSite.id}`, {
        data: {
          visit_date: visitDateDraft,
          outcome: Number(outcomeDraft.trim()),
        },
      })
      setVisitOutcomeOpen(false)
      await loadPage()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setVisitOutcomeError(detail ?? "Failed to update visit details.")
    } finally {
      setVisitOutcomeSaving(false)
    }
  }

  async function deploySite() {
    setDeploying(true)
    setDeployError("")
    try {
      await api.post(`/sites/${projectKey}/${currentSite.id}/deploy`)
      await loadPage()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setDeployError(detail ?? "Failed to deploy site.")
    } finally {
      setDeploying(false)
    }
  }

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
        {showDeployButton || deployError ? (
          <section className="glass-panel flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Deployment</p>
              <p className="mt-2 text-sm text-jscolors-text/65">Move this site from staged to Permission Awaited.</p>
              {deployError ? <p className="mt-2 text-sm text-red-600">{deployError}</p> : null}
            </div>
            {showDeployButton ? (
              <Button type="button" onClick={() => void deploySite()} disabled={deploying}>
                {deploying ? "Deploying..." : "Deploy Site"}
              </Button>
            ) : null}
          </section>
        ) : null}
        <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
          <SiteFieldsSection
            site={site}
            projectKey={projectKey}
            fields={regularFields}
            badgeById={badgeById}
            stateById={stateById}
            canSiteWrite={canSiteWrite}
            onOpenField={(field) => {
              openFieldEditor(field)
              setEditError("")
            }}
            onOpenVisitOutcome={openVisitOutcomeEditor}
          />
          {can("billing", "read") && <SiteBillingSection site={site} canWrite={can("billing", "write")} onSaved={loadPage} />}
        </div>

        <Modal
          isOpen={editingField !== null}
          title={editingField?.field.label ?? "Edit"}
          onClose={() => setEditingField(null)}
          size="sm"
          submitLabel="Save"
          onSubmit={() => void saveFieldEdit()}
          isSubmitting={editSaving}
        >
          {editingField ? (
            <div className="space-y-4">
              <FieldRenderer
                mode="input"
                field={{ ...editingField.field, options: optionsForField(editingField.field, states) }}
                value={editingField.draft}
                onChange={(value) => setEditingField((current) => (current ? { ...current, draft: value } : null))}
              />
              {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
            </div>
          ) : null}
        </Modal>

        <Modal
          isOpen={visitOutcomeOpen}
          title="Visit & Outcome"
          onClose={() => {
            setVisitOutcomeOpen(false)
            setVisitOutcomeError("")
          }}
          size="sm"
          submitLabel="Save"
          onSubmit={() => void saveVisitOutcome()}
          isSubmitting={visitOutcomeSaving}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Visit Date *</span>
              <input
                type="date"
                value={visitDateDraft}
                onChange={(event) => setVisitDateDraft(event.target.value)}
                className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Outcome *</span>
              <SelectInput
                value={outcomeDraft}
                onChange={(event) => setOutcomeDraft(event.target.value)}
              >
                <option value="">Select Outcome</option>
                {outcomes.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </SelectInput>
            </label>
            {visitOutcomeError ? <p className="text-sm text-red-600">{visitOutcomeError}</p> : null}
          </div>
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
            statusKey={site.status_key}
            projectKey={projectKey}
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
            statusKey={site.status_key}
            onReload={loadPage}
          />
        </section>
      </div>
    </DetailPageLayout>
  )
}
