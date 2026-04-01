import { useState } from "react"

import Button from "../../../../components/ui/Button"
import DetailFieldCard from "../../../../components/ui/DetailFieldCard"
import FieldRenderer from "../../../../components/ui/FieldRenderer"
import Modal from "../../../../components/ui/Modal"
import { updateInvoice, updatePo } from "../../../../services/billingService"
import type { SiteDetail } from "../../siteDetailTypes"

const fieldCls = "w-full rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 text-sm outline-none"
const TODAY = new Date().toISOString().slice(0, 10)

type InvTab = "details" | "submission" | "settlement"

const COMPLETION_DATE_KEY: Record<string, string> = {
  mi: "completion_date",
  md: "dismantle_date",
  ma: "audit_date",
  mc: "cm_date",
}

function sanitizeDocNo(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9/-]/g, "")
}

type Props = {
  site: SiteDetail
  canWrite: boolean
  onSaved: () => Promise<void>
}

export default function SiteBillingSection({ site, canWrite, onSaved }: Props) {
  const poId = site.fields.po_id as number | null | undefined
  const invoiceId = site.fields.invoice_id as number | null | undefined
  const isBB = site.project_key === "bb"
  const isFirstBBInvoicePeriodLocked = isBB && !site.fields.invoice_period_from && !!site.fields.po_valid_from

  const [editingPo, setEditingPo] = useState(false)
  const [draftPoNo, setDraftPoNo] = useState("")
  const [draftPoDate, setDraftPoDate] = useState("")
  const [draftPoValidFrom, setDraftPoValidFrom] = useState("")
  const [draftPoValidTo, setDraftPoValidTo] = useState("")
  const [poSaving, setPoSaving] = useState(false)
  const [poError, setPoError] = useState("")

  const [editingInv, setEditingInv] = useState(false)
  const [invTab, setInvTab] = useState<InvTab>("details")
  const [draftInvNo, setDraftInvNo] = useState("")
  const [draftInvDate, setDraftInvDate] = useState("")
  const [draftPeriodFrom, setDraftPeriodFrom] = useState("")
  const [draftPeriodTo, setDraftPeriodTo] = useState("")
  const [draftSubmissionDate, setDraftSubmissionDate] = useState("")
  const [draftSettlementDate, setDraftSettlementDate] = useState("")
  const [invSaving, setInvSaving] = useState(false)
  const [invError, setInvError] = useState("")

  if (!poId) return null

  function openPoEditor() {
    setDraftPoNo((site.fields.po_number as string | null) ?? "")
    setDraftPoDate((site.fields.po_date as string | null) ?? "")
    setDraftPoValidFrom((site.fields.po_valid_from as string | null) ?? "")
    setDraftPoValidTo((site.fields.po_valid_to as string | null) ?? "")
    setPoError("")
    setEditingPo(true)
  }

  async function savePo() {
    if (!draftPoNo.trim() || !draftPoDate || (isBB && (!draftPoValidFrom || !draftPoValidTo))) {
      setPoError(isBB ? "PO Number, PO Date, Valid From, and Valid To are all required." : "PO Number and Date are both required.")
      return
    }
    setPoSaving(true)
    setPoError("")
    try {
      await updatePo(poId!, {
        po_no: draftPoNo,
        po_date: draftPoDate,
        valid_from: isBB ? draftPoValidFrom : null,
        valid_to: isBB ? draftPoValidTo : null,
      })
      setEditingPo(false)
      await onSaved()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setPoError(detail ?? "Failed to update PO.")
    } finally {
      setPoSaving(false)
    }
  }

  function openInvEditor() {
    setDraftInvNo((site.fields.invoice_number as string | null) ?? "")
    setDraftInvDate((site.fields.invoice_date as string | null) ?? "")
    setDraftPeriodFrom((site.fields.invoice_period_from as string | null) ?? (isBB ? (site.fields.po_valid_from as string | null) ?? "" : ""))
    setDraftPeriodTo((site.fields.invoice_period_to as string | null) ?? "")
    setDraftSubmissionDate((site.fields.invoice_submission_date as string | null) ?? "")
    setDraftSettlementDate((site.fields.invoice_settlement_date as string | null) ?? "")
    setInvTab("details")
    setInvError("")
    setEditingInv(true)
  }

  async function saveInv() {
    if (!draftInvNo.trim() || !draftInvDate || (isBB && (!draftPeriodFrom || !draftPeriodTo))) {
      setInvTab("details")
      setInvError(isBB ? "Invoice Number, Invoice Date, Period From, and Period To are all required." : "Invoice Number and Invoice Date are both required.")
      return
    }
    const completionDateKey = COMPLETION_DATE_KEY[site.project_key]
    const completionDate = completionDateKey ? (site.fields[completionDateKey] as string | null) : null
    if (completionDate && draftInvDate && completionDate > draftInvDate) {
      setInvTab("details")
      setInvError("Invoice date must be on or after completion date.")
      return
    }
    if (draftSubmissionDate && draftInvDate > draftSubmissionDate) {
      setInvTab("submission")
      setInvError("Invoice date must be on or before submission date.")
      return
    }
    if (draftSettlementDate && draftSubmissionDate && draftSubmissionDate > draftSettlementDate) {
      setInvTab("settlement")
      setInvError("Submission date must be on or before settlement date.")
      return
    }
    setInvSaving(true)
    setInvError("")
    try {
      await updateInvoice(invoiceId!, {
        invoice_no: draftInvNo,
        invoice_date: draftInvDate,
        period_from: isBB ? draftPeriodFrom : null,
        period_to: isBB ? draftPeriodTo : null,
        submission_date: draftSubmissionDate || null,
        settlement_date: draftSettlementDate || null,
      })
      setEditingInv(false)
      await onSaved()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setInvError(detail ?? "Failed to update invoice.")
    } finally {
      setInvSaving(false)
    }
  }

  return (
    <section className="glass-panel p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jscolors-text/42">Billing</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <DetailFieldCard
          label="PO Number"
          value={<FieldRenderer value={site.fields.po_number} />}
          onEdit={canWrite && !!site.fields.po_number ? openPoEditor : undefined}
          onAdd={canWrite && !site.fields.po_number ? openPoEditor : undefined}
        />
        <DetailFieldCard
          label="PO Date"
          value={<FieldRenderer type="date" value={site.fields.po_date} />}
          onEdit={canWrite && !!site.fields.po_date ? openPoEditor : undefined}
          onAdd={canWrite && !site.fields.po_date ? openPoEditor : undefined}
        />
        {isBB ? (
          <>
            <DetailFieldCard
              label="Valid From"
              value={<FieldRenderer type="date" value={site.fields.po_valid_from} />}
              onEdit={canWrite ? openPoEditor : undefined}
              onAdd={canWrite && !site.fields.po_valid_from ? openPoEditor : undefined}
            />
            <DetailFieldCard
              label="Valid To"
              value={<FieldRenderer type="date" value={site.fields.po_valid_to} />}
              onEdit={canWrite ? openPoEditor : undefined}
              onAdd={canWrite && !site.fields.po_valid_to ? openPoEditor : undefined}
            />
          </>
        ) : null}
        {invoiceId ? (
          <>
            <DetailFieldCard
              label="Invoice Number"
              value={<FieldRenderer value={site.fields.invoice_number} />}
              onEdit={canWrite && !!site.fields.invoice_number ? openInvEditor : undefined}
              onAdd={canWrite && !site.fields.invoice_number ? openInvEditor : undefined}
            />
            <DetailFieldCard
              label="Invoice Date"
              value={<FieldRenderer type="date" value={site.fields.invoice_date} />}
              onEdit={canWrite && !!site.fields.invoice_date ? openInvEditor : undefined}
              onAdd={canWrite && !site.fields.invoice_date ? openInvEditor : undefined}
            />
            {isBB ? (
              <>
                <DetailFieldCard
                  label="Period From"
                  value={<FieldRenderer type="date" value={site.fields.invoice_period_from} />}
                  onEdit={canWrite ? openInvEditor : undefined}
                  onAdd={canWrite && !site.fields.invoice_period_from ? openInvEditor : undefined}
                />
                <DetailFieldCard
                  label="Period To"
                  value={<FieldRenderer type="date" value={site.fields.invoice_period_to} />}
                  onEdit={canWrite ? openInvEditor : undefined}
                  onAdd={canWrite && !site.fields.invoice_period_to ? openInvEditor : undefined}
                />
              </>
            ) : null}
          </>
        ) : null}
      </div>

      <Modal
        isOpen={editingPo}
        title="Edit PO Details"
        onClose={() => { setEditingPo(false); setPoError("") }}
        size="sm"
        submitLabel="Save"
        onSubmit={() => void savePo()}
        isSubmitting={poSaving}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">PO Number *</span>
            <input
              type="text"
              value={draftPoNo}
              onChange={(e) => setDraftPoNo(sanitizeDocNo(e.target.value))}
              className={fieldCls}
              placeholder="e.g. PO/2026/001"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">PO Date *</span>
            <input
              type="date"
              value={draftPoDate}
              onChange={(e) => setDraftPoDate(e.target.value)}
              className={fieldCls}
              max={TODAY}
            />
          </label>
          {isBB ? (
            <>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Valid From *</span>
                <input
                  type="date"
                  value={draftPoValidFrom}
                  onChange={(e) => setDraftPoValidFrom(e.target.value)}
                  className={fieldCls}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Valid To *</span>
                <input
                  type="date"
                  value={draftPoValidTo}
                  onChange={(e) => setDraftPoValidTo(e.target.value)}
                  className={fieldCls}
                />
              </label>
            </>
          ) : null}
          {poError ? <p className="text-sm text-red-600">{poError}</p> : null}
        </div>
      </Modal>

      <Modal
        isOpen={editingInv}
        title="Invoice Details"
        onClose={() => { setEditingInv(false); setInvError("") }}
        size="sm"
        submitLabel="Save"
        onSubmit={() => void saveInv()}
        isSubmitting={invSaving}
      >
        <div className="space-y-4">
          {(() => {
            const canSubmission = !!(site.fields.invoice_number && site.fields.invoice_date)
            const canSettlement = !!site.fields.invoice_submission_date
            return (
              <div className="flex gap-2">
                <Button size="sm" variant={invTab === "details" ? "primary" : "secondary"} onClick={() => setInvTab("details")}>Details</Button>
                <Button size="sm" variant={invTab === "submission" ? "primary" : canSubmission ? "secondary" : "ghost"} disabled={!canSubmission} onClick={() => canSubmission && setInvTab("submission")}>Submission</Button>
                <Button size="sm" variant={invTab === "settlement" ? "primary" : canSettlement ? "secondary" : "ghost"} disabled={!canSettlement} onClick={() => canSettlement && setInvTab("settlement")}>Settlement</Button>
              </div>
            )
          })()}

          {invTab === "details" && (
            <>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Invoice Number *</span>
                <input
                  type="text"
                  value={draftInvNo}
                  onChange={(e) => setDraftInvNo(sanitizeDocNo(e.target.value))}
                  className={fieldCls}
                  placeholder="e.g. INV/2026/001"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Invoice Date *</span>
                <input
                  type="date"
                  value={draftInvDate}
                  onChange={(e) => setDraftInvDate(e.target.value)}
                  className={fieldCls}
                  max={TODAY}
                />
              </label>
              {isBB ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Period From *</span>
                    <input
                      type="date"
                      value={draftPeriodFrom}
                      onChange={(e) => setDraftPeriodFrom(e.target.value)}
                      className={fieldCls}
                      disabled={isFirstBBInvoicePeriodLocked}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Period To *</span>
                    <input
                      type="date"
                      value={draftPeriodTo}
                      onChange={(e) => setDraftPeriodTo(e.target.value)}
                      className={fieldCls}
                    />
                  </label>
                </>
              ) : null}
            </>
          )}

          {invTab === "submission" && (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Submission Date</span>
              <input
                type="date"
                value={draftSubmissionDate}
                onChange={(e) => setDraftSubmissionDate(e.target.value)}
                className={fieldCls}
                max={TODAY}
              />
            </label>
          )}

          {invTab === "settlement" && (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45">Settlement Date</span>
              <input
                type="date"
                value={draftSettlementDate}
                onChange={(e) => setDraftSettlementDate(e.target.value)}
                className={fieldCls}
                max={TODAY}
              />
            </label>
          )}

          {invError ? <p className="text-sm text-red-600">{invError}</p> : null}
        </div>
      </Modal>
    </section>
  )
}
