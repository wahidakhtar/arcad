# Codex Handoff

## Current status

- Backend and frontend both compile/build cleanly as of this handoff.
- Latest verified commands:
  - `/Users/wahidakhtar/software/backend/venv/bin/python3.9 -m compileall /Users/wahidakhtar/software/backend/app /Users/wahidakhtar/software/backend/migrations`
  - `npm run build` in `/Users/wahidakhtar/software/frontend`
  - `/Users/wahidakhtar/software/backend/venv/bin/alembic upgrade head`
- Latest git push: `9fc81ed` (main). Both backend and frontend auto-deploy on push to main.
- Railway DB: `autorack.proxy.rlwy.net:33504`, alembic version `20260320_0008`.

---

## What was fixed today (2026-03-20)

### Fix 1 — Add Rate: confirmed working (no code change needed)
- `POST /billing/rate-card` already returns HTTP 200 for both Riya (accl2) and Saddam (mgmtl3).
- The permission fix (`billing` tag replacing the broken `rate` tag) was deployed in a prior session (`4c5d001`).
- DB confirmed: `accl2` has `billing` write=TRUE; `mgmtl3` has all permissions.
- The "Unable to add rate" error was the old pre-fix behaviour and is no longer reproducible.

### Fix 2 — calculator.py: HEIGHT_SCALED_JOBS made data-driven
- Migration `20260320_0006` adds `scale_by VARCHAR(16)` column to `schema_core.jobs`.
- Values seeded: `height` (mi, mpaint, md), `numeric` (ec / Earthing Cable), `unit` (all others: ma, nbr, ep, mdv, arr).
- `HEIGHT_SCALED_JOBS` set removed from `calculator.py`.
- `_job_quantity(site, job_key, scale_by)` now takes `scale_by` string parameter.
- All public calculator functions (`site_cost_for_bucket`, `fe_budget`, `fe_cost`, `fe_balance`, `calculate_site_financials`, `calculate_fo_view`) now accept `job_scales: dict[str, str]` (bucket_key → scale_by).
- `sites.py` fetches `job_scales` from `schema_core.jobs` and passes to `calculate_site_financials`.
- Files: `backend/migrations/versions/20260320_0006_jobs_scale_by.py`, `backend/app/config/calculator.py`, `backend/app/models/core.py`, `backend/app/services/sites.py`

### Fix 3 — frontend config files deleted, UI metadata fully API-driven
- Migration `20260320_0007` adds to each project `ui_fields` table (mi/md/ma/mc/bb): `form_view BOOL`, `bulk_view BOOL`, `section VARCHAR(32)`.
- Also adds `supports_subprojects BOOL` to `schema_core.projects`.
- `supports_subprojects` seeded: md/ma/mc = true, mi/bb = false.
- `form_view`/`bulk_view` seeded from the now-deleted config files.
- `section` seeded: `finance` for billing/financial fields, `site` for all others.
- `list_ui_fields` now returns all 8 columns from DB (id, key, label, list_view, type, form_view, bulk_view, section).
- `list_projects` now returns `supports_subprojects` per project.
- **Deleted**: `frontend/src/config/mi.ts`, `md.ts`, `ma.ts`, `mc.ts`, `bb.ts`
- `SiteListPage.tsx` now reads label + supports_subprojects from `/projects` API and form/bulk fields from `form_view`/`bulk_view` flags. No config import.
- Files: `backend/migrations/versions/20260320_0007_ui_fields_meta.py`, `backend/app/models/core.py`, `backend/app/services/projects.py`, `frontend/src/config/index.ts`, `frontend/src/features/sites/SiteListPage.tsx`

### Fix 4 — FIELD_WRITE_SCOPE moved from auth.py to DB
- Migration `20260320_0008` creates `schema_core.field_permissions` table (field_key, dept_key).
- Seeded 30 rows: 22 ops fields (receiving_date, height, address, city, etc.) and 8 acc fields (po_status_id, invoice_status_id, etc.).
- `FIELD_WRITE_SCOPE` dict removed from `auth.py`.
- `check_field_write_scope(user, field_name, db)` now queries `schema_core.field_permissions`.
- `mgmt` bypass unchanged (mgmt always passes field scope check).
- Save Fields confirmed working on Railway: HTTP 200 for mgmt user writing `height`.
- Files: `backend/migrations/versions/20260320_0008_field_permissions.py`, `backend/app/models/core.py`, `backend/app/api/auth.py`

---

## Still open / not yet confirmed working

1. **Save Fields for ops users** — field write confirmed for mgmt. Ops user field write needs live verification (no confirmed ops user password available in session).

2. **Cost calculator live verification** — Fix 2 changed mpaint from bool-gated to height-scaled, and removed mdv/ma from height-scaling. An MI site with height=30 should show financials budget ≈ rate × 30. Needs confirmation with a real site that has an active FE assignment.

3. **Transaction dropdown for Riya (acc)** — Migration 0005 (schema_acc.badge_transitions) is applied. Riya is accl2. The dropdown should show for acc users on Requested transactions. Needs live UI verification.

4. **Level-aware field permissions not implemented** — ops L1 and L2 have identical write access in FIELD_WRITE_SCOPE (now in DB). Spec requires L1 to only edit doc badge fields. Both the `field_permissions` table and `ROLE_ACTION_RULES` would need level-aware checks.

5. **ROLE_ACTION_RULES still hardcoded** — `auth.py` line 19–25 defines the dept-level permission matrix as a Python dict. This was deliberately left for a later refactor (larger scope than FIELD_WRITE_SCOPE).

6. **No pagination on list endpoints** — tickets, transactions, sites all return all rows.

7. **SiteDetailPage.tsx is 700+ lines** — needs component extraction.

---

## Railway deployment notes

- **Backend URL**: `https://arcad-production.up.railway.app`
- **Frontend URL**: `https://arcad-production-8cc4.up.railway.app`
- **DB host**: `autorack.proxy.rlwy.net:33504`
- **Migrations**: Run automatically on container startup (`alembic upgrade head && uvicorn ...` in Dockerfile CMD).
- **Auto-deploy**: Railway deploys frontend + backend on every `git push origin main`.
- **User passwords**: Riya = `riya`. Saddam/Wahid = unknown (check Railway DB or reset). Admin: admin/admin123.

---

## Backend implemented

- FastAPI app/router structure:
  - `backend/app/api/routes/auth.py`
  - `backend/app/api/routes/badges.py`
  - `backend/app/api/routes/billing.py` — rate card (GET/POST), jobs (GET), POs, invoices
  - `backend/app/api/routes/dashboard.py`
  - `backend/app/api/routes/media.py`
  - `backend/app/api/routes/projects.py`
  - `backend/app/api/routes/reports.py`
  - `backend/app/api/routes/sites.py` — includes `/assignments/{fe_id}/{bucket_id}/remove`
  - `backend/app/api/routes/states.py`
  - `backend/app/api/routes/tickets.py` — includes `GET /{ticket_id}` and `PATCH /{ticket_id}/close`
  - `backend/app/api/routes/transactions.py` — includes `/transitions` endpoint
  - `backend/app/api/routes/updates.py`
  - `backend/app/api/routes/users.py`
- Backend stays Python 3.9-compatible. Use `Optional[...]`, not `X | None`.
- Migrations through `20260320_0008`.

### Permission system
- `ROLE_ACTION_RULES` in `backend/app/api/auth.py` defines tag-level access per dept (still hardcoded — Fix 4 only moved FIELD_WRITE_SCOPE).
- `check_field_write_scope` queries `schema_core.field_permissions` (field_key, dept_key rows). `mgmt` users bypass this check entirely.
- `PermissionDenied` raises as a plain exception; global handler in `main.py` converts to HTTP 403.
- Known seeded tags: `billing`, `transaction`, `site`, `field`, `user`, `subproject`, `project`, `role`, `update`. The `rate` tag is seeded in DB but NOT used in routes — use `billing` for all billing operations.

### Cost calculation
- `backend/app/config/calculator.py`
- `HEIGHT_SCALED_JOBS` removed. Jobs now carry `scale_by` from `schema_core.jobs`: `height` (mi, mpaint, md), `numeric` (ec), `unit` (all others).
- `_job_quantity(site, job_key, scale_by)`: height → site["height"], numeric → site[job_key], unit → 1 if truthy else 0.
- `calculate_site_financials` takes `job_scales: dict[str, str]` (bucket_key → scale_by) as fifth argument.
- `sites.py` fetches job_scales from DB and passes to calculator.
- `_select_rate` picks most recent rate ≤ receiving_date.

### UI fields API
- `GET /projects/{key}/ui-fields` returns: id, key, label, list_view, type, form_view, bulk_view, section.
- `GET /projects` returns: id, key, label, active, recurring, supports_subprojects, subprojects.
- `schema_core.field_permissions` table: field_key + dept_key pairs defining which depts can write each field.

---

## Frontend implemented

- `frontend/src/components/ui/DataTable.tsx`, `FieldRenderer.tsx`, `AddForm.tsx`, `BulkTable.tsx`, `FilterBar.tsx`
- `frontend/src/hooks/useListPage.ts`
- `frontend/src/config/` — now only `dashboard.ts`, `people.ts`, `index.ts` (project configs deleted)
- Site list page: reads ALL metadata from API (form_view, bulk_view, list_view). No config dependency.
- Site detail page: all ui_fields, badge transitions, save button, updates, tickets, FE assignment, transactions
- Transactions page: acc-only interactive status dropdown with execution date modal
- Rate Card page: native table-fixed, Add Rate modal
- Ticket list page + detail page
- Sidebar: dept+level-gated visibility, Rate Card at top level, independent counts fetch
- Dashboard: choropleth map, date filter, role-scoped summary

---

## DB schema summary

- `schema_core.jobs`: id, job_bucket_id, bucket_key, job_key, label, **scale_by**
- `schema_core.projects`: id, key, label, active, recurring, **supports_subprojects**
- `schema_core.field_permissions`: id, field_key, dept_key (30 rows)
- `schema_{key}.ui_fields` (mi/md/ma/mc/bb): id, label, tag, list_view, type, **form_view**, **bulk_view**, **section**
- `schema_acc.badge_transitions`: req→cancel, req→rej, req→exct (transaction transitions)

---

## Servers

- Deployed to Railway. Auto-deploys on push to `main` branch.
- Railway PostgreSQL: `autorack.proxy.rlwy.net:33504`
- Backend API base: `https://arcad-production.up.railway.app/api/v1`
- Frontend: `https://arcad-production-8cc4.up.railway.app`
- Local dev: start backend with `uvicorn app.main:app --reload` from `backend/`, frontend with `npm run dev` from `frontend/`.
