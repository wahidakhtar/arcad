# Codex Handoff

## Current status

- Backend and frontend both compile/build cleanly as of this handoff.
- Latest verified commands:
  - `/Users/wahidakhtar/software/backend/venv/bin/python3.9 -m compileall /Users/wahidakhtar/software/backend/app /Users/wahidakhtar/software/backend/migrations`
  - `npm run build` in `/Users/wahidakhtar/software/frontend`
  - `/Users/wahidakhtar/software/backend/venv/bin/alembic upgrade head`
- Latest git push: `c09a327` (2026-03-22). Both backend and frontend auto-deploy on push to main.
- Railway DB: `autorack.proxy.rlwy.net:33504`, alembic version `20260321_0024`.
- Local DB may be behind Railway — re-sync before next session if needed.

---

## What was done today (2026-03-22, session 2) — frontend visual fixes

### Fix 1 — Squircle clip-path persisting on page content wrappers (root cause fix)
- **Root cause**: React reuses the same DOM node when a page transitions from its loading state (`<div className="glass-panel p-6">Loading...</div>`) to its loaded state (`<div className="space-y-6">...</div>`). React updates `className` but leaves `style.clipPath` set by the observer intact. The content wrapper ends up squircle-clipped, cutting off Add buttons at top-right corner and table corners.
- **Fix 1**: Removed `glass-panel` from all loading/error/not-found early-return states across 10 page files (RateCardPage, InvoicesPage, POsPage, TicketsPage, TicketDetailPage, PeoplePage, UserDetailPage, SiteListPage, SiteDetailPage, TransactionsPage). These now use plain `p-6 text-jscolors-text/50` / `p-6 text-red-600`.
- **Fix 2**: Observer in `App.tsx` now tracks squircled elements in a `Set<Element>`. On each scan, clears `style.clipPath` from any element that is no longer connected or has lost the `glass-panel`/`squircle` class. MutationObserver also watches `attributeFilter: ["class"]` to catch React className swaps immediately.

### Fix 2 — Layout panels removed from glass-panel / squircle observer
- `<main>` and `<aside>` in `PageLayout.tsx`/`Sidebar.tsx` no longer use the `glass-panel` class. Styles applied directly: `border border-white/50 bg-white backdrop-blur-xl` (sidebar) and `border border-white/50 bg-white` (main), with `box-shadow` inline (not `filter: drop-shadow`). Observer never targets them.
- `<main>`: no `overflow-hidden` — without squircle clip-path, CSS `overflow-hidden + border-radius` would clip table corners and buttons. Content bounded by inner `overflow-y-auto` scroll div.
- `<main>`: no `backdrop-blur-xl` — useless with opaque `bg-white`; removing it eliminates an unwanted stacking context.
- `<aside>`: `rounded-[36px]` with `overflow-hidden` (sidebar content should clip to sidebar shape).

### Fix 3 — `.squircle` marker class
- New `.squircle {}` CSS class in `index.css` (no visual styles — marker only).
- Observer selector extended: `.glass-panel:not(.no-squircle), .squircle`.
- Allows any element to opt into squircle clip-path without inheriting glass-panel visual styles (border, bg, backdrop-blur, drop-shadow).

### Fix 4 — Logo pill squircle with correct border
- Logo img replaced with a wrapper div (`.squircle h-20 w-full bg-jscolors-gold/30 p-px`) + inner `<img>` (`h-full w-full bg-white object-contain p-2`).
- The 1px padding gap shows the gold background as a border that follows the squircle curve — CSS `border` on a clip-path element only shows on straight edges and disappears at corners.
- `filter: drop-shadow(0 8px 24px rgba(139,26,26,0.14))` on wrapper provides the glow (renders around squircle after clipping; box-shadow would be clipped).

### Fix 5 — People page sort order
- Sort: active users first, then by dept_key order `["mgmt", "ops", "acc", "hr", "fo"]` (previously alphabetical).
- Uses `deptOrder.indexOf(dept_key)` for comparison; unknown depts sort last (999).

### Fix 6 — People and Tickets pages: fully clickable rows
- People page: name cell no longer needs explicit click — entire table row navigates to user detail.
- Tickets page: `rowHref` on DataTable makes entire row link to ticket detail; no separate navigate button.
- Department cell merged with `rowSpan` like name cell (one cell spans all roles for a user).
- Modal portals: Add User and Add Rate converted to `createPortal(document.body)` to escape `backdrop-filter` containing block on `<main>`.

### Fix 7 — Copyright footer position
- Footer: `bottom-1` (4px from viewport bottom), `fixed` positioned over layout.

### Fix 8 — One-off project pages
- Non-recurring projects (HSD Tank, RBI CCTV) now clickable on ProjectsPage; route `/projects/:projectKey/overview` renders `OneOffProjectPage` placeholder.

### Fix 9 — DataTable headers always visible
- Header row: `hidden md:grid` → `grid` (always shown). Per-cell fallback labels: `md:hidden` → `hidden` (always hidden since header always shows).

---

## What was done today (2026-03-22, session 1)

### Fix 1 — DataTable header/cell alignment
- Header row used `gap-4` between columns; data rows used `gap-3` — caused x-offset between labels and values.
- Both now use `gap-4`. No padding changes needed (both already use `px-5` on the container).

### Fix 2 — DataTable `minWidth` column prop + overflow scrolling
- Added `minWidth?: number` to the `Column` type in `DataTable.tsx`.
- Applied as `style={{ minWidth: col.minWidth }}` on both header div and cell div.
- Auto-generated `gridTemplateColumns` now uses `minmax(${col.minWidth ?? 180}px, 1fr)` per column (replacing the old `repeat(N, minmax(180px, 1fr))`).
- Rows container gets `style={{ minWidth: sumOfColumnMinWidths }}` so `overflow-x-auto` scrolls the table horizontally when viewport is too narrow rather than squishing columns.

### Fix 3 — Transactions page column min-widths
- Removed explicit `gridTemplateColumns="15% 15% 12% 18% 10% 30%"` prop.
- Added per-column `minWidth`: Recipient 120, Project 120, Site 100, Type 140, Amount 100, Status 180.
- STATUS (180px) ensures Cancel button is never clipped.

### Fix 4 — Site list page column min-widths
- `listColumns` mapping in `SiteListPage.tsx` now assigns `minWidth` based on field key/type:
  - `ckt_id` → 120px, `status` → 140px, `date` type → 110px, everything else → 100px.
- All other DataTable pages (tickets, invoices, POs, updates) default to `minmax(180px, 1fr)` unchanged.

---

## What was done (2026-03-21, sessions 5–10)

### Session 5 — Schema refactor: schema_core.tags + role_tags (migration 0021)
- **Replaced `permission_tags` table** with two new tables:
  - `schema_core.tags`: self-documenting tag registry, 14 active tags seeded.
  - `schema_core.role_tags`: FK to tags(id) + roles(id), UNIQUE(role_id, tag_id). Replaces permission_tags rows.
- **Corrections applied**: acc l1 billing write=true; hr l1 role read=true (replacing old assign_role R).
- **Backend**: `PermissionTag` model → `Tag` + `RoleTag`; `auth.py` `_load_user_context` queries `role_tags JOIN tags`; signature unchanged.
- **routes/users.py + roles.py**: `"user"` tag → `"people"`; `"assign_role"` tag → `"role"`.
- **Deprecated tags removed**: `assign_role`, `user`.

### Session 6 — Site detail: perm_tag + active_fe + component extraction (migration 0022)

**Fix 1 — perm_tag field visibility**
- Migration 0022 adds `perm_tag VARCHAR` column to all project `ui_fields` tables.
- `billing` fields → `perm_tag='billing'`; `doc_badge` fields → `perm_tag='doc_badge'`.
- `list_ui_fields` returns `perm_tag`; frontend `fieldVisible()` helper filters: field renders only if `perm_tag` is null or user has that tag with read=true.
- Later extended: `perm_tag='site:write'` means field hidden unless user has site write.

**Fix 2 — active_fe denormalized column**
- Migration 0022 adds `active_fe VARCHAR(256)` to all site tables; backfilled from current assignments.
- `assign_fe` sets `active_fe = fe_user.label` on commit.
- `remove_fe_assignment` / `remove_assignment` recalculate via subquery.
- `list_sites` returns `active_fe`; seeded to `ui_fields` with `list_view=true`, `perm_tag='site:write'`.
- Frontend: `active_fe` in `READ_ONLY_FIELDS`.

**Fix 3 — Updates/tickets visibility**
- Updates panel visible when user can read OR write (not just write); Add Update form gated on write.
- Tickets panel gated on `tags.ticket?.read or write`.

**Fix 4 — SiteDetailPage.tsx extracted to components**
- `SiteDetailPage.tsx` reduced from ~700 lines to 286 lines.
- New files: `siteDetailTypes.ts`, `siteDetailHelpers.ts`, `SiteTransactionCard.tsx`, `SiteUpdatesSection.tsx`, `SiteTicketsSection.tsx`, `SiteFEAssignmentSection.tsx`.

### Session 7 — FO access fixes (migrations 0023, 0024)
- **Migration 0023**: granted `fo l1` the `site:read` tag so FO users see project modules in sidebar (was missing, caused `canTag("site")` to fail).
- **Migration 0024**: set `active_fe` field's `perm_tag = 'site:write'` → hidden from FO and other read-only roles.
- **SiteDetailPage**: Fields section rendered read-only (no inputs, no Save button) when `site:write=false`.
- **SiteFEAssignmentSection**: gated on `canSiteWrite` (replaced hardcoded `isOpsL1Only`).
- **`fieldVisible()` in siteDetailHelpers**: supports `:write` suffix on perm_tag for write-level gating.
- All FO/read-only logic is now data-driven from tags + `ui_fields.perm_tag`; no `is_fo` hardcoding.

### Sessions 8–10 — Transactions + People page overhaul

**ExecutionDateModal shared component**
- New `frontend/src/components/ui/ExecutionDateModal.tsx`: shared modal for execution/refund date confirmation.
- Uses `createPortal(document.body)` directly with `position: fixed; z-index: 9999/10000`. Accepts `title` prop (default "Set Execution Date"). Resets date to today on each open.

**TransactionsPage overhaul**
- Removed header block and ID column.
- Added RECIPIENT column (from backend `recipient_label` via raw SQL LEFT JOIN schema_hr.users).
- Added TYPE column (`type_label` from badge label).
- Column order: RECIPIENT, PROJECT, SITE, TYPE, AMOUNT, STATUS.
- AMOUNT: right-aligned with ₹ prefix + `en-IN` locale formatting.
- STATUS: `BadgeDropdown` with `txStatusLabel` display; Cancel button inline.
- Conditional execution date modal: `b_sur`/`e_sur` → immediate PATCH, `fe_pay` → "Execution Date" modal, `ref` → "Refund Date" modal.

**txStatusLabel — type-aware status display**
- `siteDetailHelpers.ts`: `txStatusLabel(typeKey, statusKey, rawLabel)` — applies only to STATUS badge display:
  - `b_sur`/`e_sur` + `exct` → "Approved"
  - `ref` + `exct` → "Received"
  - All other cases: raw label unchanged.
- Used on TransactionsPage and SiteTransactionCard.

**Transaction type filter**
- Backend `GET /projects/{key}/transaction-types` excludes `sal` and `oth` badge keys.
- Used by SiteFEAssignmentSection Request Transaction modal.

**Site detail portal modals**
- Add Update, Add Ticket, Request Transaction all converted to `createPortal(document.body)` pattern.
- Matches the established portal pattern (fixed inset backdrop z-9999, fixed centered card z-10000).

**Add Project, Add Site, Add Subproject portals**
- `ProjectsPage.tsx`, `SiteListPage.tsx`: Add modals converted to portal pattern.

**People page cleanup**
- Removed header block.
- Gate changed from `tags.user?.write` → `tags.people?.write`.
- Add User: top-right button, portal modal.

**Type label revert**
- `TX_TYPE_LABEL_OVERRIDES` and `txTypeLabel` fully removed.
- TYPE column shows raw badge labels. Only STATUS gets overrides via `txStatusLabel`.

---

## What was done today (2026-03-21, session 4)

### Fix 1 — Seed badge colors (migration 0018)
- `req` badge color set to `#0AACE8`, `exct` badge color set to `#92D050`.
- Applied against Railway DB — confirmed live.

### Fix 2 — Unified BadgeDropdown component
- New `frontend/src/components/ui/BadgeDropdown.tsx`: `BadgeChip` + `BadgeDropdown`.
  - Badge chip IS the dropdown trigger. Options render as styled `BadgeChip` badges.
  - Uses `createPortal(document.body)` with `position: fixed` to escape overflow containers.
  - `disabled` or empty `options` → renders static chip only.
- **SiteDetailPage.tsx**: header badge fields use `BadgeDropdown`; `TransactionCard` uses `BadgeDropdown` replacing separate selects/buttons.
  - cancel → confirm dialog; exct → exec date picker modal; rej → direct PATCH.
  - `canRequestWrite` gates cancel option; `canTransactionWrite` gates exct/rej options.
- **TransactionsPage.tsx**: status column replaced TxStatusBadge + exec/rej select + Cancel column with a single `BadgeDropdown` per row.
  - `allBadges` + `exctBadgeId` stored in state for color lookups and routing.
  - cancel → confirm modal; exct → execution-date modal; rej → direct PATCH.

### Fix 3 — FE Assignment "Assign FE" button
- Button always reads "Assign FE" regardless of assignment state.
- When bucket already assigned: `opacity-50 cursor-not-allowed disabled` — no label change.

### Fix 4 — Ops L1 visibility
- FE Assignment panel hidden for users where all roles are ops l1 (`isOpsL1Only`).

### Fix 5 — Site list filter fixes
- Circuit ID search: real-time client-side filter with null-safe `.toLowerCase()`.
- Status badge filter: multi-select OR logic via `selectedBadges: string[]` state in `SiteListPage`.

---

## What was done today (2026-03-21, session 1)

### Task 1 — Migration 0017: request tag + transaction cleanup

- **`request` tag** added to `schema_core.permission_tags`: mgmt l3 R+W, mgmt l2/l1 R, acc l2/l1 R, ops l3/l2 R+W, fo l1 R+W. No row for ops l1 or hr l1.
- **`transaction` write** removed from ops l3 (role 6) and fo l1 (role 10). acc l1/l2 and mgmt l3 keep R+W.
- **`req→cancel`** removed from `schema_acc.badge_transitions`. Only req→rej and req→exct remain.
- **`deleted_at`, `deleted_by`** columns dropped from `schema_acc.transactions`. Soft-delete pattern fully removed.

### Task 2 — Backend: updated transaction endpoints

- **`POST /transactions`**: now requires `request` write (was `transaction` write).
- **`PATCH /transactions/{id}/status`**: fully rewritten with per-target permission logic:
  - `req→cancel`: requires `request` write. Version check (WHERE version=? AND status=req). 0 rows → 409 "Transaction was modified by another user".
  - `req→exct`: requires `transaction` write. `execution_date` required in payload. Same version check.
  - `req→rej`: requires `transaction` write. Same version check.
  - Current status in `{exct, rej, cancel}` → 409 "No further action allowed".
- **`DELETE /transactions/{id}`** endpoint removed.
- **`list_transactions`**: returns `[]` for users where all roles are ops l1.
- `CancelRequest` schema, `cancel_transaction()` service function, all `deleted_at`/`deleted_by` references removed from backend.
- `sidebar_counts` in `projects.py`: removed `deleted_at IS NULL` filter (cancel is now a proper status; `status_id == 38` alone excludes it).
- Migration confirmed against Railway DB. permission_tags and badge_transitions verified via psql.

---

## What was done today (2026-03-20, session 3)

### Task 1 — Project module sidebar link
- Clicking a project module (MI, MD, MA, MC, BB) in the sidebar now always opens the flat site list (`/projects/{key}?exclude_staged=true`), not the subprojects page.
- Removed subproject navigation from the project click target entirely. Subproject pills (dated batches) in the sidebar still link to `/projects/{key}/sub/{id}` as before.

### Task 2 — Remove test users from Railway DB
- Deleted "Admin Device" and "Test User" from `schema_hr.users` with correct FK deletion order: refresh_tokens → sessions → user_roles → users.

### Task 3 — Available roles endpoint (`GET /roles/available`)
- New file: `backend/app/api/routes/roles.py`
- New service function: `get_available_roles(db, user_id)` in `users.py`
- Enforces: excluded combos (acc l3, hr l2/l3, fo l2/l3, mgmt l3), singletons (acc l1, acc l2, hr l1 — one holder system-wide), ops l3 per-project uniqueness, active projects only.
- Registered in `main.py`.

### Task 4 — Transaction soft-delete (cancel) with version control
- Migration `20260320_0010`: adds `deleted_at`, `deleted_by` to `schema_acc.transactions`; removes `req→cancel` badge transition row.
- `Transaction` model updated with `deleted_at`, `deleted_by`.
- `cancel_transaction()` in `transactions.py`: role-gated (mgmt l3, ops l2/l3), optimistic lock (WHERE version=?), precondition status=req.
- `DELETE /transactions/{id}` endpoint added.
- Returns 409 on version conflict.
- `list_transactions` returns all rows including soft-deleted.
- `sidebar_counts` filters `deleted_at IS NULL`.

### Task 5 — Transactions page: visual cancel + UI
- Cancelled rows shown greyed out (`opacity-50 bg-gray-50`) with badge-coloured "Cancelled" label.
- Cancel button visible for mgmt l3 / ops l2/l3 only, on req-status rows only, with confirmation modal.
- "cancel" excluded from status transition dropdown.
- 409 surfaces inline error message.

### Task 6 — People page fixes
- **Dept/level labels**: restored badge fetches for `type=department` and `type=level`; `deptLabels`/`levelLabels` maps displayed in assigned roles and dropdown.
- **Role assignment uniqueness**: `levelsForDept` memo filters by project for ops/fo; project dropdown onChange resets level_key to first available.
- **Hover highlight**: `hoveredUserId` state drives conditional `bg-jscolors-gold/10` across all rows sharing the same user_id (rowspan groups).
- **TypeScript fix**: `needsProject` const moved before its first use in `levelsForDept` useMemo (TS2448).

### Task 7 — Squircle corners
- New file: `frontend/src/lib/squircle.ts` — `squirclePath(w, h, r, k=0.1)` generates iOS-style bezier path.
- `App.tsx`: global ResizeObserver + MutationObserver applies `clip-path: path(...)` to all `.glass-panel` elements.
- `index.css`: removed `rounded-[28px]`, replaced `shadow-panel` with `filter: drop-shadow(...)` (box-shadow is clipped; filter is not).

### Task 8 — Sidebar aesthetics
- Removed redundant username line from bottom user panel.
- All nav items (`SectionLink`) brought up to pill style matching logout button: `rounded-full border px-5 py-2.5 font-semibold hover:-translate-y-0.5`.
- Billing sub-items (PO, Invoice) now full-size (removed compact variant).
- All nav button text left-aligned; subproject batch pills right-aligned.
- Footer padding reduced (`pb-6` → `pb-2`) to close gap from 12px copyright text.

### Task 9 — DB maintenance (Railway)
- Cleared all tickets, transactions, FE assignments.
- Added providers: GTPL, Railwire, Airtel, Jio to `schema_bb.providers`.
- Copied Railway DB to local (Docker postgres:18 pg_dump workaround for version mismatch).

### Task 10 — Subproject list fixes
- `list_projects` backend: removed `bucket.is_(False)` filter; all active subprojects returned; `bucket` bool included in response; ordered by `batch_date DESC NULLS LAST`.
- `SubprojectsPage.tsx`: bucket=true → label "Default", batch_date → formatted date, else → `Batch {id}`.
- Sidebar pills: still filter `!s.bucket` (only dated batches shown in sidebar, not the default bucket).

### Task 11 — Permission model docx
- Generated `docs/ARCAD_Permission_Model.docx` (6 sections: overview, role registry, tag × role matrix, assignment rules, user roster, tag glossary).
- Built with `python-docx`. Data sourced live from local DB.

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

7. **Rate card key mismatch** — Old seeded rates use job_key="mi","ma","ec" etc. New API-added rates use job_key="jmi","jma". `_select_rate` looks for old-style keys (JOB_BUCKETS values = jobs.bucket_key). New API rates with "j"-prefix are silently ignored.

---

## Railway deployment notes

- **Backend URL**: `https://arcad-production.up.railway.app`
- **Frontend URL**: `https://arcad-production-8cc4.up.railway.app`
- **DB host**: `autorack.proxy.rlwy.net:33504`
- **DB password**: `eYEvELxllCZdMQnmgGgubxjlzuzPZGgC`
- **Migrations**: Run automatically on container startup (`alembic upgrade head && uvicorn ...` in Dockerfile CMD).
- **Auto-deploy**: Railway deploys frontend + backend on every `git push origin main`.
- **User passwords**: Riya = `riya`. Saddam = `saddam`. Wahid = `wahid`. (Test users removed from DB.)

---

## Backend implemented

- FastAPI app/router structure: `auth`, `badges`, `billing`, `dashboard`, `media`, `projects`, `reports`, `sites`, `states`, `tickets`, `transactions`, `updates`, `users`
- Backend stays Python 3.9-compatible. Use `Optional[...]`, not `X | None`.
- Migrations through `20260321_0024`.

### Permission system
- `schema_core.tags` + `schema_core.role_tags` replace old `permission_tags` table (migration 0021).
- `_load_user_context` in `auth.py` queries `role_tags JOIN tags`; interface unchanged.
- `check_field_write_scope` queries `schema_core.field_permissions` (field_key, dept_key rows). `mgmt` users bypass.
- Active tags (14): `billing`, `doc_badge`, `field`, `people`, `project`, `rate`, `request`, `role`, `site`, `subproject`, `ticket`, `transaction`, `update`, `acc_update`.
- `fieldVisible(field, tags)` in `siteDetailHelpers.ts`: null perm_tag → always visible; `'billing'` → check tags.billing?.read; `'site:write'` → check tags.site?.write.

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

- `frontend/src/components/ui/BadgeDropdown.tsx` — `BadgeChip` + `BadgeDropdown` (portal-based, chip-as-trigger)
- `frontend/src/components/ui/DataTable.tsx` — grid-based table; `Column` type has `align`, `minWidth`, `render`; auto-generates `minmax()` gridTemplateColumns; container gets computed min-width for horizontal scroll
- `frontend/src/components/ui/ExecutionDateModal.tsx` — shared execution/refund date portal modal; `title` prop; resets to today on open
- `frontend/src/components/ui/FieldRenderer.tsx`, `AddForm.tsx`, `BulkTable.tsx`, `FilterBar.tsx`
- `frontend/src/hooks/useListPage.ts`
- `frontend/src/lib/squircle.ts` — squircle path generator
- `frontend/src/config/` — now only `dashboard.ts`, `people.ts`, `index.ts`
- Site list page: reads ALL metadata from API; column min-widths set from field type.
- Site detail page: extracted into `SiteDetailPage.tsx` (286 lines) + `SiteTransactionCard`, `SiteUpdatesSection`, `SiteTicketsSection`, `SiteFEAssignmentSection`, `siteDetailTypes.ts`, `siteDetailHelpers.ts`. Fields read-only when site:write=false.
- Transactions page: RECIPIENT/PROJECT/SITE/TYPE/AMOUNT/STATUS columns; BadgeDropdown per row; `txStatusLabel` for status display; conditional exec-date modal; Cancel inline; per-column min-widths.
- Rate Card page: native table-fixed, Add Rate modal
- Ticket list page + detail page
- Sidebar: dept+level-gated visibility, pill-style nav items, subproject batch pills (right-aligned), counts poll every 60s
- Dashboard: choropleth map, date filter, role-scoped summary
- People page: rowspan groups, hover highlight by user, available roles endpoint for assignment; portal Add User modal
- Squircle system (`App.tsx`): ResizeObserver + MutationObserver applies `clip-path: path(squirclePath(w,h,44))` to `.glass-panel:not(.no-squircle)` and `.squircle` elements. Tracks squircled elements in a `Set`; clears stale clip-paths when element loses the class (prevents React DOM-reuse bug). Watches `attributeFilter: ["class"]` to detect className swaps.
- `.squircle` marker class (`index.css`): no visual styles; opts element into squircle clip-path without glass-panel appearance. Used for logo pill wrapper.
- Layout panels (`PageLayout.tsx`, `Sidebar.tsx`): `<main>` and `<aside>` do NOT use `glass-panel` class — styles applied directly so observer never targets them. `<main>`: no `overflow-hidden` (prevents corner clipping of tables/buttons), no `backdrop-blur-xl` (useless with opaque bg-white). `<aside>`: `rounded-[36px] overflow-hidden`.
- Logo pill: squircle wrapper div with `bg-jscolors-gold/30 p-px` creates a 1px gold border following the squircle curve; inner img has `bg-white object-contain`. `filter: drop-shadow` for glow (box-shadow is clipped by clip-path).
- Loading/error states: all pages use plain `p-6 text-jscolors-text/50` / `p-6 text-red-600` (no `glass-panel`) to prevent stale clip-path via React DOM node reuse.
- `docs/ARCAD_Permission_Model.docx` — permission reference document

---

## DB schema summary

- `schema_core.jobs`: id, job_bucket_id, bucket_key, job_key, label, **scale_by**
  - bucket_key is the calculator key (matches JOB_BUCKETS values and rate_card job_key)
  - job_key is the display/API key (j-prefixed)
- `schema_core.job_buckets`: id, key, label (bmi→MI, bma→MA, bmc→MC, bmdv→Visit, bmd→Dismantle)
- `schema_core.projects`: id, key, label, active, recurring, **supports_subprojects**
- `schema_core.tags`: id, key, label, active — tag registry (14 rows; replaces deprecated permission_tags)
- `schema_core.role_tags`: id, role_id FK, tag_id FK, read BOOL, write BOOL — UNIQUE(role_id, tag_id)
- `schema_core.field_permissions`: id, field_key, dept_key (31 rows including provider_id/ops)
- `schema_{key}.ui_fields` (mi/md/ma/mc/bb): id, label, tag, list_view, type, form_view, bulk_view, section, **perm_tag**
  - `perm_tag` null → always visible; `'billing'` → billing read gate; `'doc_badge'` → doc_badge read gate; `'site:write'` → site write gate
- `schema_{key}.sites` (all projects): added **active_fe VARCHAR(256)** — denormalized label of currently active FE; updated by assign/remove logic
- `schema_acc.transactions`: no `deleted_at`/`deleted_by` (dropped in 0017). Cancellation is a status transition (status_id=cancel badge).
- `schema_acc.badge_transitions`: req→rej, req→exct only (cancel removed in 0017)
- `schema_bb.providers`: id, label — seeded with GTPL, Railwire, Airtel, Jio

---

## Servers

- Deployed to Railway. Auto-deploys on push to `main` branch.
- Railway PostgreSQL: `autorack.proxy.rlwy.net:33504`
- Backend API base: `https://arcad-production.up.railway.app/api/v1`
- Frontend: `https://arcad-production-8cc4.up.railway.app`
- Local dev: start backend with `uvicorn app.main:app --reload` from `backend/`, frontend with `npm run dev` from `frontend/`.
