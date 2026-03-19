# Codex Handoff

## Current status

- Backend and frontend both compile/build cleanly as of this handoff.
- Latest verified commands:
  - `/Users/wahidakhtar/software/backend/venv/bin/python3.9 -m compileall /Users/wahidakhtar/software/backend/app /Users/wahidakhtar/software/backend/migrations`
  - `npm run build` in `/Users/wahidakhtar/software/frontend`
  - `/Users/wahidakhtar/software/backend/venv/bin/alembic upgrade head`
- Deployed on Railway. Latest git push: `4c5d001` (main). Both backend and frontend auto-deploy on push to main.
- Railway DB: `autorack.proxy.rlwy.net:33504`, fully seeded with 18 users and all schema data.

---

## What was fixed in this session (2026-03-19)

### Permission system
- `check_field_write_scope` in `backend/app/api/auth.py` now short-circuits for `mgmt` dept users — they bypass the per-field scope check and can write any site field. Previously this caused silent 500s when management tried to save site fields.
- Global `PermissionDenied` exception handler added to `backend/app/main.py` — unhandled `PermissionDenied` now returns HTTP 403 instead of 500.
- POST `/billing/rate-card` was using `permission_required("rate", "write")` — there are no `PermissionTag` rows with `tag="rate"` in the DB, so it always denied. Fixed to use `permission_required("billing", "write")` which is correctly seeded.

### Cost calculator
- `_job_quantity` in `backend/app/config/calculator.py` now returns `site.get("height")` for `mi`, `ma`, `md`, `mdv` jobs instead of a flat `Decimal("1")`. These jobs scale with tower height. The bmc sub-jobs (`mpaint`, `mnbr`, `ep`, `ec`, `arr`) remain bool-gated as before.
- Previously cost showed `0.00` for all sites because the old code used `site.get("mi")` which is always `None` (no such column). That was first fixed to return `1`, then corrected again to return `height`.

### Billing — Rate Card
- Added `GET /billing/jobs` endpoint returning all jobs from `schema_core.jobs`.
- Added `POST /billing/rate-card` endpoint. Payload: `{job_id, date, cost}`. Service derives `job_key` from the `Job` row.
- Rate Card page (`frontend/src/features/billing/RateCardPage.tsx`) rebuilt as a native `<table table-fixed>` with `colgroup` (Job=50%, Effective From=25%, Rate=25%). Rate column is right-aligned with ₹ prefix and `en-IN` locale formatting. No hover/click behaviour.
- `+ Add Rate` button opens a modal with Job dropdown (fetched from `/billing/jobs`), date, and rate number fields.

### Sidebar
- Added role/dept-based visibility gating: People visible to `mgmt|hr`; Projects admin to `mgmt`; Transactions to `mgmt|acc|ops|fo`; Tickets to `mgmt|ops|fo`; Billing section to `mgmt|acc`.
- ARCAD/Operations Console text removed from sidebar header. Logo image now fills full header width (`w-full h-16 object-contain`).
- Files: `frontend/src/components/layout/Sidebar.tsx`

### People page
- Now renders one row per role assignment using a native `<table>` with `rowSpan` on the name cell. Users with multiple roles show a merged name cell vertically spanning all their role sub-rows (dept | project | access).
- Clicking any row navigates to user detail. Name cell has its own `<Link>`.
- File: `frontend/src/features/people/PeoplePage.tsx`

### Site detail — Save Fields
- `savingFields` spinner now shows "Saving..." text. Errors from the PATCH response are displayed inline next to the button.
- Frontend file: `frontend/src/features/sites/SiteDetailPage.tsx`

### Transaction transitions
- Added `GET /transactions/transitions` endpoint in `backend/app/api/routes/transactions.py`.
- `list_transitions` in `backend/app/services/transactions.py` tries schemas in order: `schema_acc → schema_mi → schema_md → schema_ma → schema_mc`, returning the first that has rows. This is resilient to the transitions being seeded in different schemas across environments.
- Migration `20260319_0004` seeds `req → exct` for all project schemas.
- Transactions page now shows an interactive status dropdown per row. Selecting "Executed" opens a date picker modal before confirming. Other transitions (cancel, reject) apply immediately.
- Transitions fetch is now independent from the main `Promise.all` in the frontend — a transitions failure never blocks the transaction list from loading.
- File: `frontend/src/features/transactions/TransactionsPage.tsx`

### Footer
- Copyright text changed from `text-[9px]` → `text-sm` (14px). Color corrected from `text-gray-300` → `text-gray-800`.
- File: `frontend/src/components/layout/PageLayout.tsx`

### User seeding
- 18 users seeded on Railway DB with bcrypt-hashed password `changeme123`.
- Roles: wahid/sandeep → mgmt; riya/vaishali/sonal/shivani → acc; babita/tamanna/ashwini/sarita/danish/parvati/raziya/anushka → ops; saddam/saquib/munna/dileep → fo.

### FE Assignment
- Bucket dropdown auto-selects and hides when the project has only one job bucket (`useEffect` watching `jobBuckets`).
- File: `frontend/src/features/sites/SiteDetailPage.tsx`

### DataTable
- Added optional `render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode` prop to `Column` type. When provided, bypasses FieldRenderer and renders custom JSX. The second `row` argument gives access to the full row for context-dependent rendering (e.g. transaction status dropdown).
- File: `frontend/src/components/ui/DataTable.tsx`

---

## Needs verification on Railway after next deploy

The following fixes were pushed and should be live, but were not confirmed end-to-end in the browser due to session ending:

1. **Add Rate** — fixed permission bug (billing tag). Needs live confirm: open Rate Card, click `+ Add Rate`, submit a new rate, confirm it appears in the table.
2. **Save Fields** — mgmt field write scope fixed. Needs live confirm: open a site detail page as Management user, change height, click Save, reload and verify the new height persists.
3. **Cost calculator** — height multiplier now applied. Needs live confirm: a site with `height = 30` should show cost ≈ rate × 30 (e.g. ₹78,000 if rate is ₹2,600). A site with `height = 1` should show ≈ ₹2,600.
4. **Transaction dropdown for Accounts user (Riya)** — transitions now fetched with schema fallback. Needs live confirm: log in as Riya, go to Transactions, verify "Requested" rows show a dropdown with Executed/Cancelled/Rejected options.

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
  - `backend/app/api/routes/sites.py`
  - `backend/app/api/routes/states.py`
  - `backend/app/api/routes/tickets.py`
  - `backend/app/api/routes/transactions.py` — includes `/transitions` endpoint
  - `backend/app/api/routes/updates.py`
  - `backend/app/api/routes/users.py`
- Backend stays Python 3.9-compatible. Use `Optional[...]`, not `X | None`.
- Workbook-driven UI metadata seeded from `docs/DB_Library and UI_design.xlsx` into `schema_{key}.ui_fields` for mi/md/ma/mc/bb.
- `schema_{key}.ui` views exist; `list_ui_fields` reads actual DB metadata.
- Site create/update normalization in `backend/app/services/sites.py` (state, date, bool, numeric, badge).
- `_resolve_subproject_id` auto-creates the bucket subproject if missing.
- `ec` is treated as numeric, not bool.
- Dashboard backend is role/dept scoped with date filtering.
- User management: get, patch identity/active, assign/remove role, reset password.
- FE assignment: `POST /sites/{project_key}/{site_id}/assignments`.
- Project metadata: `GET /projects/{project_key}/badge-transitions`, `GET /projects/{project_key}/job-buckets`.
- Transaction transitions: `GET /transactions/transitions` (schema-fallback logic).
- Migrations through `20260319_0004`:
  - `0001` — initial schema
  - `0002` — seed UI fields
  - `0003` — seed `req → cancel` transaction transitions in project schemas
  - `0004` — seed `req → exct` transaction transitions in project schemas

### Permission system
- `ROLE_ACTION_RULES` in `backend/app/api/auth.py` defines tag-level access per dept.
- `FIELD_WRITE_SCOPE` defines which fields each dept can write. `mgmt` users bypass this check entirely.
- `PermissionDenied` raises as a plain exception; global handler in `main.py` converts to HTTP 403.
- Important: only tags that have matching `PermissionTag` rows in the DB will pass `check_permission`. Known seeded tags: `billing`, `transaction`, `site`, `field`, `user`, `subproject`, `project`, `role`, `update`. The `rate` tag is NOT seeded — use `billing` for rate card writes.

### Cost calculation
- `backend/app/config/calculator.py`
- `HEIGHT_SCALED_JOBS = {"mi", "mdv", "md", "ma"}` — quantity = `site["height"]`
- `ec` — quantity = `site["ec"]` (numeric count)
- bmc sub-jobs (`mpaint`, `mnbr`, `arr`, `ep`) — quantity = 1 if site field is truthy, else 0
- `fe_budget` and `site_cost_for_bucket` both use `_job_quantity`; `_select_rate` picks most recent rate ≤ receiving_date

---

## Frontend implemented

- `frontend/src/components/ui/DataTable.tsx` — generic table with optional `render` prop per column
- `frontend/src/components/ui/FieldRenderer.tsx`, `AddForm.tsx`, `BulkTable.tsx`, `FilterBar.tsx`
- `frontend/src/hooks/useListPage.ts`
- `frontend/src/config/` — page-level config (people, dashboard, etc.)
- People page: native `<table>` with rowSpan for merged name cells; one row per role
- Site list page: dynamic columns from project ui-fields, horizontal scroll
- Site detail page: all ui_fields, badge transitions, save button, updates, tickets, FE assignment, transactions
- Transactions page: interactive status dropdown with execution date modal
- Rate Card page: native `<table table-fixed>`, right-aligned ₹ rate column, Add Rate modal
- Sidebar: dept-gated visibility, logo-only header
- Dashboard: choropleth map, date filter, role-scoped summary
- Footer: fixed bottom, `text-sm`, `text-gray-800`

---

## Important implementation notes

- `backend/venv/` is present inside the repo. Do not commit it.
- Two India map assets exist; current code uses `india-full.geojson` (district-level, heavier than ideal).
- FE assignment UI is empty if no FO users are scoped to the project.
- Transaction transitions are identical across project schemas. `list_transitions` tries schema_acc first, then mi/md/ma/mc.
- The `billing` permission tag covers all billing operations including rate card writes. The `rate` tag does not have DB entries — do not use it.

---

## Likely next targets

- Live verification of the 4 items listed under "Needs verification" above.
- Reduce India map asset to state-level polygons (currently district-level, ~3.8 MB).
- Site detail: consider extracting FE assignment and transaction panels into dedicated components.
- Transaction workflow: currently only req→cancel and req→exct are seeded in project schemas. If req→reject is needed in site-detail transaction cards, seed it.
- Review whether `schema_acc.badge_transitions` actually has transaction transitions — if so, confirm the fallback order is correct. If not, the mi/md fallback handles it.

---

## Verification history

- `psql arcad_db` — schema_mi.badge_transitions confirmed: `transaction: req → cancel`
- `alembic upgrade head` — succeeded through `20260319_0004`
- `npm run build` — clean as of commit `4c5d001`
- `python3.9 -m compileall app/` — clean as of commit `4c5d001`

## Servers

- Deployed to Railway. Auto-deploys on push to `main` branch.
- Railway PostgreSQL: `autorack.proxy.rlwy.net:33504`
- Backend API base: `https://arcad-production.up.railway.app/api/v1`
- Frontend is built via Railway's static build from `frontend/` directory.
- Local dev: start backend with `uvicorn app.main:app --reload` from `backend/`, frontend with `npm run dev` from `frontend/`.
