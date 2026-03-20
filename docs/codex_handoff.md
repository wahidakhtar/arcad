# Codex Handoff

## Current status

- Backend and frontend both compile/build cleanly as of this handoff.
- Latest verified commands:
  - `/Users/wahidakhtar/software/backend/venv/bin/python3.9 -m compileall /Users/wahidakhtar/software/backend/app /Users/wahidakhtar/software/backend/migrations`
  - `npm run build` in `/Users/wahidakhtar/software/frontend`
  - `/Users/wahidakhtar/software/backend/venv/bin/alembic upgrade head`
- Latest git push: `fc3fc86` (main). Both backend and frontend auto-deploy on push to main.
- Railway DB: `autorack.proxy.rlwy.net:33504`, alembic version `20260320_0009`.

---

## What was fixed today (2026-03-20, session 2)

### Fix 1 — FE Assignment uniqueness check
- `assign_fe()` in `sites.py` now checks if **any** active assignment exists for the same site+bucket (regardless of FE).
- Was: checking same FE+bucket → allowed multiple FEs per bucket.
- Now: raises HTTP 400 "An active FE assignment already exists for this bucket".
- Frontend `alreadyAssigned` check also updated to bucket-level (not FE+bucket).

### Fix 2 — mpaint cost conditional on site.mpaint
- `scale_by` for mpaint job changed from `"height"` to `"height_if_true"` (migration 0009).
- `_job_quantity` in `calculator.py` handles `"height_if_true"`: checks `site[job_key]` truthy first, then returns `site["height"]`, else 0.
- Before: mpaint cost = rate × height for ALL MC sites, even when mpaint=False.
- After: mpaint cost = rate × height only when `site.mpaint` is truthy.

### Fix 3 — EC cost confirmed working
- No code change needed. EC is included in `site_cost_for_bucket` via `JOB_BUCKETS["bmc"]=["mpaint","mnbr","ep","ec","arr"]`.
- EC scale_by="numeric" → qty = site.ec (cable meters). Rate = ₹32/m.
- Verified: MC site with ec=20 → 640 in both site cost and FE cost.

### Fix 4 — MA cost (was always zero)
- `scale_by` for ma job changed from `"unit"` to `"height"` (migration 0009).
- Before: `site.get("ma")` → None → cost=0.
- After: cost = MA rate (₹1000) × height. Verified: height=10 → ₹10,000.

### Fix 5 — MDV cost (was always zero)
- `scale_by` for mdv job changed from `"unit"` to `"visit_date"` (migration 0009).
- MD sites have `visit_date` column, not `mdv`. Old scale_by="unit" checked `site.get("mdv")` → None.
- New `"visit_date"` case in `_job_quantity`: returns 1 if `site.get("visit_date")` truthy, else 0.
- Rate = ₹500 flat per visit. When visit_date is set, bmdv cost = 500.

### Fix 6 — Bucket labels stripped of project prefix
- Migration 0009 updates `schema_core.job_buckets`:
  - `bmdv` label: "MD Visit" → "Visit"
  - `bmd` label: "MD" → "Dismantle"
- Frontend reads labels from API, so display updates automatically.

### Fix 7 — BB site detail: Provider panel replaces FE Assignment
- Added `GET /projects/{project_key}/providers` route (returns [] for non-BB).
- Added `list_bb_providers` service in `projects.py` — queries `schema_bb.providers`.
- `SiteDetailPage.tsx`: when `projectKey === "bb"`, shows Provider panel with provider dropdown + Set Provider button instead of FE Assignment panel.
- Provider is saved via existing `PATCH /sites/bb/{site_id}` with `{ data: { provider_id: X } }`.
- Added `"provider_id": "number"` to `FIELD_TYPE_OVERRIDES` in `sites.py`.
- Added `provider_id` to `schema_core.field_permissions` for `ops` dept in migration 0009.

---

## What was fixed today (2026-03-20, session 1)

### Fix 1 — Add Rate: confirmed working (no code change needed)
- `POST /billing/rate-card` already returns HTTP 200 for both Riya (accl2) and Saddam (mgmtl3).

### Fix 2 — calculator.py: HEIGHT_SCALED_JOBS made data-driven
- Migration `20260320_0006` adds `scale_by VARCHAR(16)` column to `schema_core.jobs`.
- `HEIGHT_SCALED_JOBS` set removed from `calculator.py`.

### Fix 3 — frontend config files deleted, UI metadata fully API-driven
- Migration `20260320_0007` adds `form_view`, `bulk_view`, `section` to each project's `ui_fields` table.
- **Deleted**: `frontend/src/config/mi.ts`, `md.ts`, `ma.ts`, `mc.ts`, `bb.ts`

### Fix 4 — FIELD_WRITE_SCOPE moved from auth.py to DB
- Migration `20260320_0008` creates `schema_core.field_permissions` table.
- 30 rows seeded: 22 ops fields, 8 acc fields.

---

## Still open / not yet confirmed working

1. **Save Fields for ops users** — field write confirmed for mgmt. Ops user field write needs live verification.

2. **Transaction dropdown for Riya (acc)** — Migration 0005 applied. Needs live UI verification.

3. **Level-aware field permissions not implemented** — ops L1 and L2 have identical write access. Spec requires L1 to only edit doc badge fields.

4. **ROLE_ACTION_RULES still hardcoded** — `auth.py` line 19–25. Deliberately left for later refactor.

5. **No pagination on list endpoints** — tickets, transactions, sites all return all rows.

6. **SiteDetailPage.tsx is 700+ lines** — needs component extraction.

7. **BB providers table has no data** — `schema_bb.providers` is empty. Someone needs to seed provider names via DB or an admin UI.

8. **Rate card key mismatch** — Old seeded rates use job_key="mi","ma","ec" etc. New API-added rates use job_key="jmi","jma". `_select_rate` looks for old-style keys (JOB_BUCKETS values = jobs.bucket_key). New API rates with "j"-prefix are silently ignored.

---

## Railway deployment notes

- **Backend URL**: `https://arcad-production.up.railway.app`
- **Frontend URL**: `https://arcad-production-8cc4.up.railway.app`
- **DB host**: `autorack.proxy.rlwy.net:33504`
- **DB password**: `eYEvELxllCZdMQnmgGgubxjlzuzPZGgC`
- **Migrations**: Run automatically on container startup (`alembic upgrade head && uvicorn ...` in Dockerfile CMD).
- **Auto-deploy**: Railway deploys frontend + backend on every `git push origin main`.
- **User passwords**: Riya = `riya`. Saddam = `saddam`. Admin = `admin`/`admin123`.

---

## Backend implemented

- FastAPI app/router structure: `auth`, `badges`, `billing`, `dashboard`, `media`, `projects`, `reports`, `sites`, `states`, `tickets`, `transactions`, `updates`, `users`
- Backend stays Python 3.9-compatible. Use `Optional[...]`, not `X | None`.
- Migrations through `20260320_0009`.

### Permission system
- `ROLE_ACTION_RULES` in `backend/app/api/auth.py` defines tag-level access per dept (hardcoded).
- `check_field_write_scope` queries `schema_core.field_permissions` (field_key, dept_key rows). `mgmt` users bypass.
- Known seeded tags: `billing`, `transaction`, `site`, `field`, `user`, `subproject`, `project`, `role`, `update`.

### Cost calculation (`backend/app/config/calculator.py`)
- `JOB_BUCKETS`: `bmi→[mi]`, `bmdv→[mdv]`, `bmd→[md]`, `bma→[ma]`, `bmc→[mpaint,mnbr,ep,ec,arr]`
- `scale_by` values in `schema_core.jobs`:
  - `"height"` → qty = site.height (mi, md, ma)
  - `"height_if_true"` → qty = site.height if site[job_key] truthy else 0 (mpaint)
  - `"numeric"` → qty = site[job_key] as decimal (ec)
  - `"visit_date"` → qty = 1 if site.visit_date else 0 (mdv)
  - `"unit"` → qty = 1 if site[job_key] else 0 (nbr, ep, arr)
- `_select_rate(job_key, receiving_date, rate_rows)` picks most recent rate ≤ receiving_date.
- Rate card seeded with job_key = jobs.bucket_key (e.g., "mi", "ma") — NOT jobs.job_key ("jmi", "jma").

### BB-specific
- `schema_bb.providers` table: id, name.
- `GET /projects/bb/providers` → list of providers.
- BB sites have `provider_id FK` on `schema_bb.sites`. Writable via PATCH with `data: {provider_id: N}`.
- BB site detail shows Provider panel instead of FE Assignment.
- BB has no job buckets / FE assignments.

---

## Frontend implemented

- `frontend/src/components/ui/DataTable.tsx`, `FieldRenderer.tsx`, `AddForm.tsx`, `BulkTable.tsx`, `FilterBar.tsx`
- `frontend/src/hooks/useListPage.ts`
- `frontend/src/config/` — now only `dashboard.ts`, `people.ts`, `index.ts`
- Site list page: reads ALL metadata from API.
- Site detail page: all ui_fields, badge transitions, save button, updates, tickets, FE assignment (non-BB), Provider panel (BB), transactions
- Transactions page: acc-only interactive status dropdown
- Rate Card page: native table-fixed, Add Rate modal
- Ticket list page + detail page
- Sidebar: dept+level-gated visibility, independent counts fetch
- Dashboard: choropleth map, date filter, role-scoped summary

---

## DB schema summary

- `schema_core.jobs`: id, job_bucket_id, bucket_key, job_key, label, **scale_by**
  - bucket_key is the calculator key (matches JOB_BUCKETS values and rate_card job_key)
  - job_key is the display/API key (j-prefixed)
- `schema_core.job_buckets`: id, key, label (bmi→MI, bma→MA, bmc→MC, bmdv→Visit, bmd→Dismantle)
- `schema_core.projects`: id, key, label, active, recurring, **supports_subprojects**
- `schema_core.field_permissions`: id, field_key, dept_key (31 rows including provider_id/ops)
- `schema_{key}.ui_fields` (mi/md/ma/mc/bb): id, label, tag, list_view, type, form_view, bulk_view, section
- `schema_acc.badge_transitions`: req→cancel, req→rej, req→exct
- `schema_bb.providers`: id, name (empty — needs seeding)

---

## Servers

- Deployed to Railway. Auto-deploys on push to `main` branch.
- Railway PostgreSQL: `autorack.proxy.rlwy.net:33504`
- Backend API base: `https://arcad-production.up.railway.app/api/v1`
- Frontend: `https://arcad-production-8cc4.up.railway.app`
- Local dev: start backend with `uvicorn app.main:app --reload` from `backend/`, frontend with `npm run dev` from `frontend/`.
