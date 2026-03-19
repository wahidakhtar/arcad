# Codex Handoff

## Current status

- Backend and frontend both compile/build cleanly as of this handoff.
- Latest verified commands:
  - `/Users/wahidakhtar/software/backend/venv/bin/python3.9 -m compileall /Users/wahidakhtar/software/backend/app /Users/wahidakhtar/software/backend/migrations`
  - `npm run build` in `/Users/wahidakhtar/software/frontend`
  - `/Users/wahidakhtar/software/backend/venv/bin/alembic upgrade head`

## Backend implemented

- FastAPI app/router structure is now centered around:
  - `backend/app/api/routes/auth.py`
  - `backend/app/api/routes/badges.py`
  - `backend/app/api/routes/billing.py`
  - `backend/app/api/routes/dashboard.py`
  - `backend/app/api/routes/media.py`
  - `backend/app/api/routes/projects.py`
  - `backend/app/api/routes/reports.py`
  - `backend/app/api/routes/sites.py`
  - `backend/app/api/routes/states.py`
  - `backend/app/api/routes/tickets.py`
  - `backend/app/api/routes/transactions.py`
  - `backend/app/api/routes/updates.py`
  - `backend/app/api/routes/users.py`
- Backend stays Python 3.9-compatible. Use `Optional[...]`, not `X | None`.
- Workbook-driven UI metadata is seeded from `docs/DB_Library and UI_design.xlsx` into:
  - `schema_mi.ui_fields`
  - `schema_md.ui_fields`
  - `schema_ma.ui_fields`
  - `schema_mc.ui_fields`
  - `schema_bb.ui_fields`
- `schema_{key}.ui` views exist and `list_ui_fields` reads the actual DB metadata rather than a hardcoded fallback:
  - `backend/app/services/projects.py`
  - `backend/migrations/versions/20260318_0002_seed_ui_fields.py`
- Site create/update normalization is implemented in:
  - `backend/app/services/sites.py`
- Normalization currently includes:
  - state name -> `state_id`
  - `dd/mm/yyyy` and ISO date parsing
  - bool parsing from `true/false/1/0/yes/no`
  - numeric parsing to float
  - badge field resolution from label/key/id
- Single-site create was fixed end-to-end. Root cause was invalid/missing bucket subproject FK; `_resolve_subproject_id` now resolves or auto-creates the bucket subproject when needed:
  - `backend/app/services/sites.py`
- Bulk subproject upload converts pasted text values using UI field metadata:
  - `backend/app/services/projects.py`
- `ec` is treated as numeric, not bool:
  - `backend/app/services/projects.py`
  - `backend/app/services/sites.py`
- Dashboard backend is role/dept scoped and supports date filtering for summary and map:
  - `backend/app/services/dashboard.py`
  - `backend/app/api/routes/dashboard.py`
- Dashboard map payload now returns per-state project breakdowns for tooltip rendering.
- User management backend now supports:
  - get user
  - patch user identity/active
  - assign role
  - remove role
  - reset password
  - files:
    - `backend/app/api/routes/users.py`
    - `backend/app/services/users.py`
    - `backend/app/schemas/user.py`
- Site detail backend now returns FE financial rows:
  - `backend/app/services/sites.py`
- FE assignment route exists:
  - `POST /sites/{project_key}/{site_id}/assignments`
  - files:
    - `backend/app/api/routes/sites.py`
    - `backend/app/services/sites.py`
- Project metadata endpoints added for unified frontend behavior:
  - `GET /projects/{project_key}/badge-transitions`
  - `GET /projects/{project_key}/job-buckets`
  - files:
    - `backend/app/api/routes/projects.py`
    - `backend/app/services/projects.py`
- Site badge updates are now validated against per-schema transition tables rather than arbitrary badge writes:
  - `backend/app/services/sites.py`
- Transaction create now auto-assigns requested status (`req`) so inserts succeed:
  - `backend/app/services/transactions.py`
- Transaction cancel transition was seeded into project transition tables via migration:
  - `backend/migrations/versions/20260318_0003_seed_transaction_transitions.py`
- Verified in DB after migration:
  - `schema_mi.badge_transitions` contains `transaction: req -> cancel`
  - `schema_md.badge_transitions` contains `transaction: req -> cancel`

## Frontend implemented

- Shared UI/data-driven refactor is in place:
  - `frontend/src/components/ui/FieldRenderer.tsx`
  - `frontend/src/components/ui/AddForm.tsx`
  - `frontend/src/components/ui/BulkTable.tsx`
  - `frontend/src/components/ui/FilterBar.tsx`
  - `frontend/src/hooks/useListPage.ts`
  - `frontend/src/config/`
- `BulkTable` is now pure text-entry only. No dropdowns/date pickers/checkboxes remain there:
  - `frontend/src/components/ui/BulkTable.tsx`
- Projects page is read-only and toggle-free:
  - `frontend/src/features/projects/ProjectsPage.tsx`
- People page:
  - rows navigate to user detail
  - add-user modal is present
  - department/access display use badge labels instead of raw keys
  - files:
    - `frontend/src/features/people/PeoplePage.tsx`
    - `frontend/src/config/people.ts`
- User detail page:
  - identity fields editable
  - activate/deactivate button
  - change password flow
  - functional role assign/remove
  - files:
    - `frontend/src/features/people/UserDetailPage.tsx`
- Site list page:
  - dynamic columns from project ui-fields
  - horizontal scrolling for dense tables
  - no extra `All Sites` heading
  - badge filter row only
  - file:
    - `frontend/src/features/sites/SiteListPage.tsx`
- Site detail page is no longer placeholder-only:
  - renders all `ui_fields`, not just `list_view = true`
  - top badge row for status/doc/report/WCC-style badges
  - badge transitions driven by `schema_{key}.badge_transitions`
  - one save button for all non-badge site fields
  - add update panel
  - add ticket panel
  - FE assignment panel
  - request transaction action on each FE row, tied to that FE + bucket
  - transaction status change dropdown driven by transitions
  - file:
    - `frontend/src/features/sites/SiteDetailPage.tsx`
- Dashboard page:
  - filter options at top
  - command overview card removed
  - scope label removed
  - uses actual choropleth component
  - files:
    - `frontend/src/features/dashboard/DashboardPage.tsx`
    - `frontend/src/features/dashboard/IndiaMap.tsx`
    - `frontend/src/config/dashboard.ts`
- India map:
  - uses `react-simple-maps`
  - no longer renders state cards
  - now uses local India-focused GeoJSON asset instead of remote fetch
  - asset:
    - `frontend/src/assets/india-full.geojson`
- Copyright/footer:
  - handled in `frontend/src/components/layout/PageLayout.tsx`
  - currently moved out of the scrollable card as a direct footer child of the page shell

## Important implementation notes

- There are many unrelated legacy deletions/additions in the git worktree. Do not assume the current diff is only from the latest task.
- `backend/venv/` is present inside the repo/workspace and shows up in status.
- Two India map assets now exist:
  - `frontend/src/assets/india-states.json` (older, international/disputed-border cut)
  - `frontend/src/assets/india-full.geojson` (newer, India-focused full-country source)
  - current code uses `india-full.geojson`
- The new India asset is district-level, not pre-dissolved to state polygons. It works for display, but it is heavier than ideal.
- FE assignment UI depends on FO users existing for the relevant project scope. If no matching FO roles exist, assignment options will be empty.
- Transaction cancel currently uses the existing `cancel` badge from `schema_core.badges` as requested.

## Likely next cleanup targets

- Reduce India map asset size by converting `india-full.geojson` to state-level polygons while keeping the full India boundary.
- Move more site-detail behavior out of the page component into shared config/adapters.
- Add backend read/write APIs for any missing workflow panels that are still basic or generic.
- Tighten transaction transition scoping if transaction workflow expands beyond `req -> cancel`.
- Review footer placement in the live browser once servers are restarted; code is updated, but final visual confirmation was not possible inside this shell.

## Verification history

- `psql arcad_db -c "SELECT label, tag, list_view, type FROM schema_mi.ui ORDER BY id;"`
  - succeeded after workbook seeding
- `psql arcad_db -c "SELECT id, ckt_id, status_id FROM schema_mi.sites ORDER BY id;"`
  - confirmed site insert path was working after backend fix
- `alembic upgrade head`
  - succeeded through `20260318_0003`

## Servers

- This handoff was updated at the end of the session before shutting down the dev servers.
- If the servers need to be restarted later, confirm the exact commands from the user’s preferred workflow rather than assuming.
