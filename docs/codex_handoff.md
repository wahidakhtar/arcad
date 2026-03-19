# Codex Handoff

## Current status

- Backend and frontend both compile/build cleanly as of this handoff.
- Latest verified commands:
  - `/Users/wahidakhtar/software/backend/venv/bin/python3.9 -m compileall /Users/wahidakhtar/software/backend/app /Users/wahidakhtar/software/backend/migrations`
  - `npm run build` in `/Users/wahidakhtar/software/frontend`
  - `/Users/wahidakhtar/software/backend/venv/bin/alembic upgrade head`
- Latest git push: `0b211e8` (main). Both backend and frontend auto-deploy on push to main.
- Railway DB: `autorack.proxy.rlwy.net:33504`, fully seeded with 18 users and all schema data.

---

## What was fixed today (2026-03-20)

### Transaction transitions
- Migration `20260319_0005` creates `schema_acc.badge_transitions` table and seeds `req → cancel`, `req → rej`, `req → exct` (transition type = transaction).
- `list_transitions` in `backend/app/services/transactions.py` now reads exclusively from `schema_acc.badge_transitions` — no fallback to project schemas.
- File: `backend/app/services/transactions.py`

### Transaction status dropdown — role gating
- `TransactionsPage.tsx` now imports `useAuth` and derives `isAccUser = roles.some(r => r.dept_key === "acc")`.
- Interactive dropdown (with Cancelled / Rejected / Executed options) shown only to acc dept users.
- All other depts (mgmt, ops, fo) see plain text status.
- Execution date modal fires when acc user selects Executed (req → exct transition).
- File: `frontend/src/features/transactions/TransactionsPage.tsx`

### Dockerfile — auto-migrate on deploy
- `CMD` updated to `alembic upgrade head && uvicorn ...` so migrations apply automatically on every Railway deploy.
- File: `backend/Dockerfile`

### Tickets — status column
- `GET /tickets` now returns ALL tickets (open + closed), not just open ones.
- Tickets list page: closing date column removed, replaced with a STATUS badge (green "Open" / grey "Closed").
- Ticket number is now a clickable link that navigates to `/tickets/{id}`.
- File: `frontend/src/features/tickets/TicketsPage.tsx`, `backend/app/services/tickets.py`, `backend/app/api/routes/tickets.py`

### Ticket detail page
- New page at `/tickets/:ticketId` (`frontend/src/features/tickets/TicketDetailPage.tsx`).
- Shows: ticket number, project label, site ckt_id, date, note/RFO, open/closed status.
- "Close Ticket" button visible on open tickets — calls `PATCH /tickets/{id}/close` which sets `closing_date = today` server-side.
- Route added in `frontend/src/App.tsx`.

### Close Ticket button — Site detail page
- Site detail ticket panel now shows an inline "Close" button against each open ticket.
- On click, calls `PATCH /tickets/{id}/close` and reloads the page.
- File: `frontend/src/features/sites/SiteDetailPage.tsx`

### FE duplicate assignment prevention
- Assign FE button on Site detail disabled (shows "Already Assigned") when the selected FE + bucket combination is already active in `fe_rows`.
- Remove button added to each active FE row — opens a modal prompting for an optional final cost before confirming.
- New backend endpoint: `PATCH /sites/{project_key}/{site_id}/assignments/{fe_id}/{bucket_id}/remove` (service: `remove_fe_assignment` in `backend/app/services/sites.py`).
- Files: `backend/app/services/sites.py`, `backend/app/api/routes/sites.py`, `frontend/src/features/sites/SiteDetailPage.tsx`

### Rate Card — sidebar repositioning
- Rate Card moved from inside the BILLING sub-section to a standalone top-level nav item.
- Role gating: `mgmt | acc | ops L2/L3` (checks `r.level_key` for ops).
- Billing sub-section now contains only PO and Invoice.
- File: `frontend/src/components/layout/Sidebar.tsx`

### Sidebar open ticket count
- Projects fetch and counts fetch are now independent (`Promise.all` replaced with two separate `.catch`-guarded calls).
- A projects API failure no longer silently zeroes the ticket/transaction counts.
- File: `frontend/src/components/layout/Sidebar.tsx`

---

## Still open / not yet confirmed working

1. **Add Rate "Unable to add rate"** — The `billing/write` permission fix was deployed in `4c5d001` and has been verified working on Railway (HTTP 200 confirmed). If it is still failing for a specific user, check `schema_core.permission_tags` on Railway DB for that user's role_id — the seeded rows should have `(role_id, tag='billing', write=true)` for accl2 (role_id=4) and accl1 (role_id=5). Needs Railway DB URL to debug further.

2. **Save Fields button on site detail not persisting** — mgmt field write scope fix was deployed in a prior session. Needs live confirmation: open a site as wahid/sandeep (mgmt), change height, click Save, reload and verify persistence.

3. **Cost calculator not applying height multiplier** — `_job_quantity` now returns `site["height"]` for `mi/md/ma/mdv` jobs. Needs live confirmation: a site with `height = 30` should show cost ≈ rate × 30.

4. **Transaction dropdown for Riya (acc)** — requires migration `0005` to have run on Railway DB. With Dockerfile now running `alembic upgrade head` on startup, it should apply on the next Railway deploy. Verify: log in as riya/riya, go to Transactions, confirm Requested rows show dropdown with Executed/Cancelled/Rejected.

---

## Railway deployment notes

- **Backend URL**: `https://arcad-production.up.railway.app`
- **Frontend URL**: `https://arcad-production-8cc4.up.railway.app`
- **DB host**: `autorack.proxy.rlwy.net:33504`
- **Migrations**: Now run automatically on container startup (`alembic upgrade head && uvicorn ...` in Dockerfile). Full Railway DB URL is available in Railway dashboard under the PostgreSQL service → Connect → "Postgres Connection URL". Set as `DATABASE_URL` env var in the backend service.
- **Auto-deploy**: Railway deploys frontend + backend on every `git push origin main`.
- **User passwords**: Mixed — not all users have `changeme123`. Riya's password is `riya`. Verify others in Railway DB if needed.
- **Admin**: wahid or sandeep (mgmt dept, password unknown — check Railway DB or reset via `/users/{id}/reset-password`).

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
- Workbook-driven UI metadata seeded from `docs/DB_Library and UI_design.xlsx` into `schema_{key}.ui_fields` for mi/md/ma/mc/bb.
- `schema_{key}.ui` views exist; `list_ui_fields` reads actual DB metadata.
- Site create/update normalization in `backend/app/services/sites.py` (state, date, bool, numeric, badge).
- `_resolve_subproject_id` auto-creates the bucket subproject if missing.
- `ec` is treated as numeric, not bool.
- Dashboard backend is role/dept scoped with date filtering.
- User management: get, patch identity/active, assign/remove role, reset password.
- FE assignment: `POST /sites/{project_key}/{site_id}/assignments`, `PATCH .../assignments/{fe_id}/{bucket_id}/remove`.
- Project metadata: `GET /projects/{project_key}/badge-transitions`, `GET /projects/{project_key}/job-buckets`.
- Transaction transitions: `GET /transactions/transitions` (reads from schema_acc only).
- Migrations through `20260319_0005`:
  - `0001` — initial schema
  - `0002` — seed UI fields
  - `0003` — seed `req → cancel` transaction transitions in project schemas
  - `0004` — seed `req → exct` transaction transitions in project schemas
  - `0005` — create `schema_acc.badge_transitions`, seed `req → cancel`, `req → rej`, `req → exct`

### Permission system
- `ROLE_ACTION_RULES` in `backend/app/api/auth.py` defines tag-level access per dept.
- `FIELD_WRITE_SCOPE` defines which fields each dept can write. `mgmt` users bypass this check entirely.
- `PermissionDenied` raises as a plain exception; global handler in `main.py` converts to HTTP 403.
- Known seeded tags: `billing`, `transaction`, `site`, `field`, `user`, `subproject`, `project`, `role`, `update`. The `rate` tag is NOT seeded — use `billing` for rate card writes.

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
- Site detail page: all ui_fields, badge transitions, save button, updates, tickets (with Close button), FE assignment (with duplicate guard + Remove modal), transactions
- Transactions page: acc-only interactive status dropdown with execution date modal
- Rate Card page: native `<table table-fixed>`, right-aligned ₹ rate column, Add Rate modal
- Ticket list page: status column (Open/Closed), clickable ticket numbers → detail page
- Ticket detail page: ticket info, Close Ticket button
- Sidebar: dept+level-gated visibility, Rate Card at top level, independent counts fetch
- Dashboard: choropleth map, date filter, role-scoped summary
- Footer: fixed bottom, `text-sm`, `text-gray-800`

---

## Opus architectural review findings (priority order)

1. **Level-aware field permissions not implemented** — ops L1 and L2 currently have identical write access. Spec requires L1 to only edit doc badge fields. `FIELD_WRITE_SCOPE` in `auth.py` and sidebar gating need level checks.
2. **Frontend config files duplicate API metadata** — `mi.ts`, `md.ts`, etc. in `frontend/src/config/` mirror data already in `schema_{key}.ui_fields`. Delete and fetch from API only.
3. **No pagination on list endpoints** — `GET /tickets`, `/transactions`, `/sites/{key}` return all rows. Will break at scale. Add `limit`/`offset` query params.
4. **`SiteDetailPage.tsx` is 700+ lines** — extract `TransactionSection`, `UpdateSection`, `TicketSection` into dedicated components.
5. **Duplicated site models** (`MISite`, `MDSite`, etc.) — all are identical except extra columns. Consider SQLAlchemy table inheritance or a single `sites` table with a `project_key` discriminator long term.

---

## Important implementation notes

- `backend/venv/` is present inside the repo. Do not commit it.
- Two India map assets exist; current code uses `india-full.geojson` (district-level, ~3.8 MB — consider switching to state-level).
- FE assignment UI is empty if no FO users are scoped to the project.
- Transaction transitions always read from `schema_acc.badge_transitions`. Project schema transitions are for site badge transitions only.
- The `billing` permission tag covers all billing operations including rate card writes. The `rate` tag does not have DB entries — do not use it.
- `PATCH /tickets/{id}/close` sets `closing_date = date.today()` server-side — no body required from frontend.
- FE remove endpoint: `PATCH /sites/{key}/{site_id}/assignments/{fe_id}/{bucket_id}/remove`, body `{final_cost: number | null}`.

---

## Servers

- Deployed to Railway. Auto-deploys on push to `main` branch.
- Railway PostgreSQL: `autorack.proxy.rlwy.net:33504`
- Backend API base: `https://arcad-production.up.railway.app/api/v1`
- Frontend: `https://arcad-production-8cc4.up.railway.app`
- Local dev: start backend with `uvicorn app.main:app --reload` from `backend/`, frontend with `npm run dev` from `frontend/`.
