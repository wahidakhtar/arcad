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

function localTodayIso() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function detailMessage(detail: unknown, fallback: string) {
  if (typeof detail === "string" && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object" && "msg" in item) return String(item.msg)
        return null
      })
      .filter((item): item is string => Boolean(item))
      .join(", ") || fallback
  }
  if (detail && typeof detail === "object") {
    if ("detail" in detail && typeof detail.detail === "string" && detail.detail.trim()) return detail.detail
    if ("msg" in detail && typeof detail.msg === "string" && detail.msg.trim()) return detail.msg
  }
  return fallback
}

export default function SiteDetailPage() {
  const today = localTodayIso()
  const { can, roles, projectKeys } = useAuth()
  const [visitOutcomeOpen, setVisitOutcomeOpen] = useState(false)
  const [visitDateDraft, setVisitDateDraft] = useState("")
  const [outcomeDraft, setOutcomeDraft] = useState("")
  const [visitOutcomeSaving, setVisitOutcomeSaving] = useState(false)
  const [visitOutcomeError, setVisitOutcomeError] = useState("")
  const [auditResultsOpen, setAuditResultsOpen] = useState(false)
  const [auditDateDraft, setAuditDateDraft] = useState("")
  const [auditPaintDraft, setAuditPaintDraft] = useState(false)
  const [auditNutBoltDraft, setAuditNutBoltDraft] = useState(false)
  const [auditArresterDraft, setAuditArresterDraft] = useState(false)
  const [auditEarthpitDraft, setAuditEarthpitDraft] = useState(false)
  const [auditEarthingCableDraft, setAuditEarthingCableDraft] = useState("")
  const [auditResultsSaving, setAuditResultsSaving] = useState(false)
  const [auditResultsError, setAuditResultsError] = useState("")
  const [dismantleOpen, setDismantleOpen] = useState(false)
  const [dismantleDateDraft, setDismantleDateDraft] = useState("")
  const [scrapValueDraft, setScrapValueDraft] = useState("")
  const [dismantleSaving, setDismantleSaving] = useState(false)
  const [dismantleError, setDismantleError] = useState("")
  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState("")
  const [transferringToCm, setTransferringToCm] = useState(false)
  const [transferToCmError, setTransferToCmError] = useState("")
  const [generatingReport, setGeneratingReport] = useState(false)
  const [generateReportError, setGenerateReportError] = useState("")
  const [reportSubmitOpen, setReportSubmitOpen] = useState(false)
  const [reportSubmitDateDraft, setReportSubmitDateDraft] = useState("")
  const [reportSubmitSaving, setReportSubmitSaving] = useState(false)
  const [reportSubmitError, setReportSubmitError] = useState("")
  const [terminateOpen, setTerminateOpen] = useState(false)
  const [terminateDateDraft, setTerminateDateDraft] = useState("")
  const [terminateSaving, setTerminateSaving] = useState(false)
  const [terminateError, setTerminateError] = useState("")
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
    punchPoints,
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
  const canDocBadgeWrite = can("doc_badge", "write")
  const reportStatusId = currentSite?.fields?.report_status_id as number | null | undefined
  const reportStatusKey = reportStatusId != null ? (badgeById.get(reportStatusId)?.key ?? null) : null
  const showGenerateReport = (projectKey === "ma" || projectKey === "mc")
    && currentSite.status_key === "comp"
    && canDocBadgeWrite
    && reportStatusKey === "pend"
  const showSubmitReport = (projectKey === "ma" || projectKey === "mc")
    && canDocBadgeWrite
    && reportStatusKey === "gen"

  const canDeployStagedSite = Boolean(
    project?.id && roles.some((role) => (
      ((role.dept_key === "ops" && role.level_key === "l3") || (role.dept_key === "mgmt" && (role.level_key === "l2" || role.level_key === "l3")))
        && (role.project_id === null || role.project_id === project.id)
    )),
  )
  const showDeployButton = canSiteWrite && canDeployStagedSite && site.status_key === "stage"
  const hasGlobalProjectScope = roles.some((role) => role.project_id === null)
  const canAccessMcProject = hasGlobalProjectScope || projectKeys.includes("mc")
  const siteTransferredToMc = Boolean(currentSite.fields.transferred_to_mc)
  const showProceedWithCm = projectKey === "ma" && currentSite.status_key === "comp" && canSiteWrite && canAccessMcProject

  function openVisitOutcomeEditor() {
    setVisitDateDraft((currentSite.fields.visit_date as string | null) ?? "")
    setOutcomeDraft(String((currentSite.fields.outcome_id as number | null) ?? ""))
    setVisitOutcomeError("")
    setVisitOutcomeOpen(true)
  }

  function openDismantleEditor() {
    setDismantleDateDraft((currentSite.fields.dismantle_date as string | null) ?? "")
    setScrapValueDraft(
      currentSite.fields.scrap_value == null ? "" : String(currentSite.fields.scrap_value),
    )
    setDismantleError("")
    setDismantleOpen(true)
  }

  function openAuditResultsEditor() {
    setAuditDateDraft((currentSite.fields.audit_date as string | null) ?? "")
    setAuditPaintDraft(Boolean(currentSite.fields.mpaint))
    setAuditNutBoltDraft(Boolean(currentSite.fields.mnbr))
    setAuditArresterDraft(Boolean(currentSite.fields.arr))
    setAuditEarthpitDraft(Boolean(currentSite.fields.ep))
    setAuditEarthingCableDraft(
      currentSite.fields.ec == null ? "" : String(currentSite.fields.ec),
    )
    setAuditResultsError("")
    setAuditResultsOpen(true)
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
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setVisitOutcomeError(detailMessage(detail, "Failed to update visit details."))
    } finally {
      setVisitOutcomeSaving(false)
    }
  }

  async function saveDismantle() {
    setDismantleSaving(true)
    setDismantleError("")
    try {
      await api.patch(`/sites/${projectKey}/${currentSite.id}`, {
        data: {
          dismantle_date: dismantleDateDraft || null,
          scrap_value: scrapValueDraft.trim() === "" ? null : Number(scrapValueDraft),
        },
      })
      setDismantleOpen(false)
      await loadPage()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setDismantleError(detailMessage(detail, "Failed to update dismantle details."))
    } finally {
      setDismantleSaving(false)
    }
  }

  async function saveAuditResults() {
    if (!auditDateDraft) {
      setAuditResultsError("Audit Date is required.")
      return
    }
    setAuditResultsSaving(true)
    setAuditResultsError("")
    try {
      await api.patch(`/sites/${projectKey}/${currentSite.id}`, {
        data: {
          audit_date: auditDateDraft,
          mpaint: auditPaintDraft,
          mnbr: auditNutBoltDraft,
          arr: auditArresterDraft,
          ep: auditEarthpitDraft,
          ec: auditEarthingCableDraft.trim() === "" ? null : Number(auditEarthingCableDraft),
        },
      })
      setAuditResultsOpen(false)
      await loadPage()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setAuditResultsError(detailMessage(detail, "Failed to update audit details."))
    } finally {
      setAuditResultsSaving(false)
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

  async function generateReport() {
    setGeneratingReport(true)
    setGenerateReportError("")
    try {
      const response = await api.post(
        `/sites/${projectKey}/${currentSite.id}/generate-report`,
        {},
        { responseType: "blob" },
      )
      const blob = new Blob([response.data as BlobPart], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `report_${projectKey}_${currentSite.id}.html`
      anchor.click()
      URL.revokeObjectURL(url)
      await loadPage()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setGenerateReportError(detail ?? "Failed to generate report.")
    } finally {
      setGeneratingReport(false)
    }
  }

  async function saveReportSubmission() {
    if (!reportSubmitDateDraft) {
      setReportSubmitError("Submission date is required.")
      return
    }
    setReportSubmitSaving(true)
    setReportSubmitError("")
    try {
      await api.patch(`/sites/${projectKey}/${currentSite.id}`, {
        data: { report_submission_date: reportSubmitDateDraft },
      })
      setReportSubmitOpen(false)
      await loadPage()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      setReportSubmitError(detailMessage(detail, "Failed to save submission date."))
    } finally {
      setReportSubmitSaving(false)
    }
  }

  async function saveTermination() {
    if (!terminateDateDraft) {
      setTerminateError("Termination date is required.")
      return
    }
    setTerminateSaving(true)
    setTerminateError("")
    try {
      await api.post(`/sites/bb/${currentSite.id}/terminations`, { date: terminateDateDraft })
      setTerminateOpen(false)
      await loadPage()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setTerminateError(detail ?? "Failed to terminate site.")
    } finally {
      setTerminateSaving(false)
    }
  }

  async function transferToCm() {
    setTransferringToCm(true)
    setTransferToCmError("")
    try {
      await api.post(`/sites/ma/${currentSite.id}/transfer-to-mc`)
      await loadPage()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setTransferToCmError(detail ?? "Failed to transfer site to CM.")
    } finally {
      setTransferringToCm(false)
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
        {showGenerateReport || generateReportError ? (
          <section className="glass-panel flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Report</p>
              <p className="mt-2 text-sm text-jscolors-text/65">Generate the completion report for this site.</p>
              {generateReportError ? <p className="mt-2 text-sm text-red-600">{generateReportError}</p> : null}
            </div>
            {showGenerateReport ? (
              <Button type="button" onClick={() => void generateReport()} disabled={generatingReport}>
                {generatingReport ? "Generating..." : "Generate Report"}
              </Button>
            ) : null}
          </section>
        ) : null}
        {showSubmitReport ? (
          <section className="glass-panel flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Report Submission</p>
              <p className="mt-2 text-sm text-jscolors-text/65">Record the date this report was submitted to the client.</p>
            </div>
            <Button
              type="button"
              onClick={() => {
                const existing = currentSite.fields.report_submission_date as string | null
                setReportSubmitDateDraft(existing ?? "")
                setReportSubmitError("")
                setReportSubmitOpen(true)
              }}
            >
              Record Submission Date
            </Button>
          </section>
        ) : null}
        {showProceedWithCm || transferToCmError ? (
          <section className="glass-panel flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">CM Handoff</p>
              <p className="mt-2 text-sm text-jscolors-text/65">
                {siteTransferredToMc
                  ? "This audit site has already been transferred to the CM project."
                  : "Create the corresponding CM site from this completed audit site."}
              </p>
              {transferToCmError ? <p className="mt-2 text-sm text-red-600">{transferToCmError}</p> : null}
            </div>
            {showProceedWithCm ? (
              <Button
                type="button"
                onClick={() => void transferToCm()}
                disabled={transferringToCm || siteTransferredToMc}
              >
                {siteTransferredToMc ? "Transferred to CM" : transferringToCm ? "Transferring..." : "Proceed with CM"}
              </Button>
            ) : null}
          </section>
        ) : null}
        {projectKey === "bb" && canSiteWrite && (site.status_key !== "term") ? (
          <section className="glass-panel flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Terminate Site</p>
              <p className="mt-2 text-sm text-jscolors-text/65">Record the termination date and mark this site as terminated.</p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setTerminateDateDraft("")
                setTerminateError("")
                setTerminateOpen(true)
              }}
            >
              Terminate
            </Button>
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
            onOpenDismantle={openDismantleEditor}
            onOpenAuditResults={openAuditResultsEditor}
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
                max={today}
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

        <Modal
          isOpen={dismantleOpen}
          title="Dismantle Details"
          onClose={() => {
            setDismantleOpen(false)
            setDismantleError("")
          }}
          size="sm"
          submitLabel="Save"
          onSubmit={() => void saveDismantle()}
          isSubmitting={dismantleSaving}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Dismantle Date</span>
              <input
                type="date"
                value={dismantleDateDraft}
                onChange={(event) => setDismantleDateDraft(event.target.value)}
                className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
                max={today}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Scrap Value</span>
              <input
                type="number"
                value={scrapValueDraft}
                onChange={(event) => setScrapValueDraft(event.target.value)}
                className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
                min="0"
                step="0.01"
              />
            </label>
            {dismantleError ? <p className="text-sm text-red-600">{dismantleError}</p> : null}
          </div>
        </Modal>

        <Modal
          isOpen={reportSubmitOpen}
          title="Report Submission Date"
          onClose={() => {
            setReportSubmitOpen(false)
            setReportSubmitError("")
          }}
          size="sm"
          submitLabel="Save"
          onSubmit={() => void saveReportSubmission()}
          isSubmitting={reportSubmitSaving}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Submission Date *</span>
              <input
                type="date"
                value={reportSubmitDateDraft}
                onChange={(event) => setReportSubmitDateDraft(event.target.value)}
                className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
                max={today}
              />
            </label>
            {reportSubmitError ? <p className="text-sm text-red-600">{reportSubmitError}</p> : null}
          </div>
        </Modal>

        <Modal
          isOpen={auditResultsOpen}
          title="Audit Results"
          onClose={() => {
            setAuditResultsOpen(false)
            setAuditResultsError("")
          }}
          size="sm"
          submitLabel="Save"
          onSubmit={() => void saveAuditResults()}
          isSubmitting={auditResultsSaving}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Audit Date *</span>
              <input
                type="date"
                value={auditDateDraft}
                onChange={(event) => setAuditDateDraft(event.target.value)}
                className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
                max={today}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3">
              <span className="text-sm font-medium text-jscolors-text">Painting</span>
              <input
                type="checkbox"
                checked={auditPaintDraft}
                onChange={(event) => setAuditPaintDraft(event.target.checked)}
                className="h-4 w-4 accent-jscolors-crimson"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3">
              <span className="text-sm font-medium text-jscolors-text">Nut-Bolt Replacement</span>
              <input
                type="checkbox"
                checked={auditNutBoltDraft}
                onChange={(event) => setAuditNutBoltDraft(event.target.checked)}
                className="h-4 w-4 accent-jscolors-crimson"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3">
              <span className="text-sm font-medium text-jscolors-text">Lightning Arrester</span>
              <input
                type="checkbox"
                checked={auditArresterDraft}
                onChange={(event) => setAuditArresterDraft(event.target.checked)}
                className="h-4 w-4 accent-jscolors-crimson"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3">
              <span className="text-sm font-medium text-jscolors-text">Earthpit</span>
              <input
                type="checkbox"
                checked={auditEarthpitDraft}
                onChange={(event) => setAuditEarthpitDraft(event.target.checked)}
                className="h-4 w-4 accent-jscolors-crimson"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Earthing Cable</span>
              <input
                type="number"
                value={auditEarthingCableDraft}
                onChange={(event) => setAuditEarthingCableDraft(event.target.value)}
                className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
                min="0"
                step="0.01"
              />
            </label>
            {auditResultsError ? <p className="text-sm text-red-600">{auditResultsError}</p> : null}
          </div>
        </Modal>

        <Modal
          isOpen={terminateOpen}
          title="Terminate Site"
          onClose={() => {
            setTerminateOpen(false)
            setTerminateError("")
          }}
          size="sm"
          submitLabel="Terminate"
          onSubmit={() => void saveTermination()}
          isSubmitting={terminateSaving}
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Termination Date *</span>
              <input
                type="date"
                value={terminateDateDraft}
                onChange={(event) => setTerminateDateDraft(event.target.value)}
                className="w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-jscolors-crimson/40"
                max={today}
              />
            </label>
            {terminateError ? <p className="text-sm text-red-600">{terminateError}</p> : null}
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
            punchPoints={punchPoints}
            canTicketRead={can("ticket", "read")}
            canTicketWrite={can("ticket", "write")}
            projectId={site.project_id}
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
