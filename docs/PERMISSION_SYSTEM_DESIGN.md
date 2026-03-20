# ARCAD Permission & Visibility System — Design Document

**Date:** 2026-03-20
**Status:** Draft — awaiting review before implementation

---

## Current State Summary

| Component | Status |
|-----------|--------|
| `schema_core.permission_tags` | 62 rows mapping role_id → tag → read/write |
| `schema_core.field_permissions` | 31 rows mapping field_key → dept_key (write only) |
| `ROLE_ACTION_RULES` in `auth.py` | Hardcoded Python dict — **must be eliminated** |
| `hasPermission()` in `auth.ts` | Hardcoded dept_key checks — **must be eliminated** |
| Sidebar visibility | Hardcoded dept key checks in `Sidebar.tsx` |
| Data scoping (sites) | Partially implemented (FO only via `_site_accessible_to_fo`) |
| Data scoping (tickets/transactions) | **Not implemented** — all rows returned |

### Existing Roles (schema_hr.roles)

| id | key | dept_key | level_key | global_scope |
|----|-----|----------|-----------|--------------|
| 1 | mgmtl3 | mgmt | l3 | true |
| 2 | mgmtl2 | mgmt | l2 | true |
| 3 | mgmtl1 | mgmt | l1 | true |
| 4 | accl2 | acc | l2 | true |
| 5 | accl1 | acc | l1 | true |
| 6 | opsl3 | ops | l3 | false |
| 7 | opsl2 | ops | l2 | false |
| 8 | opsl1 | ops | l1 | false |
| 9 | hrl1 | hr | l1 | true |
| 10 | fol1 | fo | l1 | false |

### Existing Permission Tags (seeded)

Tags: `project`, `user`, `subproject`, `role`, `site`, `field`, `transaction`, `billing`, `rate`, `update`

---

## A. DB Schema Changes

### A1. New tags to add to `schema_core.permission_tags`

The following **new tags** must be added:

| Tag | Purpose |
|-----|---------|
| `ticket` | Controls visibility of Tickets nav item and ticket list access |
| `people` | Controls visibility of People nav item |
| `rate_card` | Controls visibility of Rate Card nav item (split from `rate`) |
| `doc_badge` | Controls read/write access to doc badge fields (wcc_status, fsr_status, tx_copy_status, report_status) |

**Note:** `project`, `transaction`, `billing`, `site` already exist. They will be reused for sidebar visibility checks directly from the DB.

### A2. No new columns needed on existing tables

The existing schema is sufficient:
- `permission_tags` already has `role_id`, `tag`, `read`, `write`
- `field_permissions` already has `field_key`, `dept_key`
- `user_roles` already has `project_id` for project scoping

**One addition needed:** Add `level_key VARCHAR(32)` column to `schema_core.field_permissions` to support level-aware field write scoping (doc_badge L1 vs L2 distinction).

Current `field_permissions` schema:
```
id | field_key | dept_key
```

New schema:
```
id | field_key | dept_key | level_key (nullable, NULL = all levels)
```

When `level_key` is NULL, the permission applies to all levels of that dept (current behavior preserved). When set, it restricts to that specific level or above.

### A3. Seed Data — New Permission Tag Rows

Starting from id=63 (62 existing rows):

#### `ticket` tag

| id | role_id | tag | read | write |
|----|---------|-----|------|-------|
| 63 | 1 (mgmtl3) | ticket | true | true |
| 64 | 2 (mgmtl2) | ticket | true | true |
| 65 | 3 (mgmtl1) | ticket | true | false |
| 66 | 6 (opsl3) | ticket | true | true |
| 67 | 7 (opsl2) | ticket | true | true |
| 68 | 8 (opsl1) | ticket | true | false |

FO (role 10) gets **no** `ticket` tag → cannot see Tickets at all.
HR (role 9) gets **no** `ticket` tag.
ACC (roles 4, 5) gets **no** `ticket` tag.

#### `people` tag

| id | role_id | tag | read | write |
|----|---------|-----|------|-------|
| 69 | 1 (mgmtl3) | people | true | true |
| 70 | 2 (mgmtl2) | people | true | true |
| 71 | 3 (mgmtl1) | people | true | false |
| 72 | 9 (hrl1) | people | true | true |

Only mgmt and HR see People.

#### `rate_card` tag

| id | role_id | tag | read | write |
|----|---------|-----|------|-------|
| 73 | 1 (mgmtl3) | rate_card | true | true |
| 74 | 2 (mgmtl2) | rate_card | true | true |
| 75 | 3 (mgmtl1) | rate_card | true | false |
| 76 | 4 (accl2) | rate_card | true | true |
| 77 | 5 (accl1) | rate_card | true | false |
| 78 | 6 (opsl3) | rate_card | true | false |
| 79 | 7 (opsl2) | rate_card | true | false |

ops l1 (role 8) and FO (role 10) get **no** `rate_card` tag.

#### `doc_badge` tag

| id | role_id | tag | read | write |
|----|---------|-----|------|-------|
| 80 | 1 (mgmtl3) | doc_badge | true | false |
| 81 | 2 (mgmtl2) | doc_badge | true | false |
| 82 | 3 (mgmtl1) | doc_badge | true | false |
| 83 | 4 (accl2) | doc_badge | true | false |
| 84 | 5 (accl1) | doc_badge | true | false |
| 85 | 6 (opsl3) | doc_badge | true | true |
| 86 | 7 (opsl2) | doc_badge | true | true |
| 87 | 8 (opsl1) | doc_badge | true | true |
| 88 | 9 (hrl1) | doc_badge | true | false |

FO (role 10) gets **no** `doc_badge` tag (read=false, write=false → omit row entirely).

### A4. Field Permissions Updates for doc_badge + level awareness

Add `level_key` column to `schema_core.field_permissions`, then insert level-aware rows:

**Doc badge field keys:** `wcc_status`, `fsr_status`, `tx_copy_status`, `report_status`

New field_permission rows for doc badge fields:

| field_key | dept_key | level_key |
|-----------|----------|-----------|
| wcc_status | ops | NULL |
| fsr_status | ops | NULL |
| tx_copy_status | ops | NULL |
| report_status | ops | NULL |

These already exist for `acc` dept (from migration 0008: `wcc_status_id`, `fsr_status_id`, `report_status_id`). The existing acc rows stay — acc can write badge transitions on these fields but the `doc_badge` tag write=false prevents them from editing the underlying doc badge values.

**Site write scope by level:**

The `site` tag already controls general site field writes. The distinction is:
- ops l1: `doc_badge` write=true, `site` write=true (but `check_field_write_scope` restricts them to doc badge fields only via field_permissions)
- ops l2/l3: `doc_badge` write=true, `site` write=true (full field access per existing field_permissions rows)

To enforce this, the existing ops field_permission rows (receiving_date, customer, height, etc.) need a `level_key` constraint:

| field_key | dept_key | level_key (current → new) |
|-----------|----------|---------------------------|
| receiving_date | ops | NULL → `l2` (l2 and above) |
| customer | ops | NULL → `l2` |
| height | ops | NULL → `l2` |
| address | ops | NULL → `l2` |
| city | ops | NULL → `l2` |
| state_id | ops | NULL → `l2` |
| lc | ops | NULL → `l2` |
| permission_date | ops | NULL → `l2` |
| edd | ops | NULL → `l2` |
| followup_date | ops | NULL → `l2` |
| completion_date | ops | NULL → `l2` |
| visit_date | ops | NULL → `l2` |
| outcome | ops | NULL → `l2` |
| dismantle_date | ops | NULL → `l2` |
| scrap_value | ops | NULL → `l2` |
| audit_date | ops | NULL → `l2` |
| mpaint | ops | NULL → `l2` |
| mnbr | ops | NULL → `l2` |
| arr | ops | NULL → `l2` |
| ep | ops | NULL → `l2` |
| ec | ops | NULL → `l2` |
| cm_date | ops | NULL → `l2` |
| provider_id | ops | NULL → `l2` |
| wcc_status | ops | NULL (all levels, including l1) |
| fsr_status | ops | NULL (all levels) |
| tx_copy_status | ops | NULL (all levels) |
| report_status | ops | NULL (all levels) |

**Level comparison logic:** `level_key` in field_permissions means "minimum level required". `l2` means l2 and l3 can write. `NULL` means all levels. The backend compares using a level hierarchy: `l1 < l2 < l3`.

---

## B. Backend Changes

### B1. `/auth/me` Response Shape

Current response:
```json
{
  "id": 1,
  "username": "saddam",
  "label": "Saddam",
  "roles": [{ "id": 1, "key": "mgmtl3", "label": "Management L3", "dept_key": "mgmt", "level_key": "l3", "project_id": null }]
}
```

New response — add `tags` and `project_keys`:
```json
{
  "id": 1,
  "username": "saddam",
  "label": "Saddam",
  "roles": [
    { "id": 1, "key": "mgmtl3", "label": "Management L3", "dept_key": "mgmt", "level_key": "l3", "project_id": null }
  ],
  "tags": {
    "project": { "read": true, "write": true },
    "user": { "read": true, "write": true },
    "site": { "read": true, "write": true },
    "field": { "read": true, "write": true },
    "transaction": { "read": true, "write": true },
    "billing": { "read": true, "write": true },
    "rate_card": { "read": true, "write": true },
    "ticket": { "read": true, "write": true },
    "people": { "read": true, "write": true },
    "doc_badge": { "read": true, "write": false },
    "update": { "read": true, "write": true }
  },
  "project_keys": ["mi", "md", "ma", "mc", "bb"]
}
```

**`tags` computation:** Union across all of the user's roles. For each tag, `read = any(role has tag.read=true)`, `write = any(role has tag.write=true)`. This is a single query:

```sql
SELECT DISTINCT pt.tag,
       bool_or(pt.read) AS read,
       bool_or(pt.write) AS write
FROM schema_core.permission_tags pt
JOIN schema_hr.user_roles ur ON ur.role_id = pt.role_id
WHERE ur.user_id = :user_id
GROUP BY pt.tag
```

**`project_keys` computation:** Derived from `user_roles`. For global_scope roles → all active project keys. For project-scoped roles → only the project keys from `user_roles.project_id`:

```sql
-- Global scope users get all projects
SELECT p.key FROM schema_core.projects p WHERE p.active = true
-- Project-scoped users get only assigned projects
SELECT DISTINCT p.key FROM schema_core.projects p
JOIN schema_hr.user_roles ur ON ur.project_id = p.id
WHERE ur.user_id = :user_id AND p.active = true
```

### B2. Eliminating ROLE_ACTION_RULES

**Delete** the `ROLE_ACTION_RULES` dict entirely from `auth.py`.

**Replace** `check_permission()` logic:

Current flow:
1. Check `ROLE_ACTION_RULES[dept_key][action]` contains `tag` → **remove this step**
2. Query `permission_tags` for `role_id + tag` → read/write check

New flow:
1. Query `permission_tags` directly for matching `role_id + tag`
2. Check `read` or `write` boolean on the row

The `ROLE_ACTION_RULES` dict was a redundant gate in front of the DB query. Since `permission_tags` already has read=false/write=false for denied combinations, the dict is unnecessary — a missing row or a false value in the DB is sufficient.

**Updated `check_permission()`:**
```python
def check_permission(roles: list[RoleContext], project_key: Optional[str], tag: str, action: str, db: Session) -> bool:
    for role in roles:
        # Project scoping check (unchanged)
        if project_key is not None and not role.global_scope:
            current_project_key = _project_key_for_id(db, role.project_id)
            if current_project_key != project_key:
                continue

        # Direct DB check — no ROLE_ACTION_RULES
        permission = db.execute(
            select(PermissionTag).where(
                PermissionTag.role_id == role.role_id,
                PermissionTag.tag == tag
            )
        ).scalar_one_or_none()
        if permission is None:
            continue
        if action == "read" and permission.read:
            return True
        if action == "write" and permission.write:
            return True
    return False
```

### B3. Caching Strategy

**Problem:** `check_permission()` runs a DB query per role per request. With ROLE_ACTION_RULES removed, every permission check hits the DB.

**Solution:** Load all permission tags for the user's roles once during `_load_user_context()` and attach them to `UserContext`.

Add to `UserContext`:
```python
@dataclass
class UserContext:
    user_id: int
    username: str
    label: str
    active: bool
    roles: list[RoleContext]
    permission_map: dict[tuple[int, str], tuple[bool, bool]]  # (role_id, tag) → (read, write)
```

In `_load_user_context()`, load all permission tags for the user's role IDs in a single query:
```python
role_ids = [r.role_id for r in roles]
perm_rows = db.execute(
    select(PermissionTag).where(PermissionTag.role_id.in_(role_ids))
).scalars().all()
permission_map = {(p.role_id, p.tag): (p.read, p.write) for p in perm_rows}
```

Then `check_permission()` does a dict lookup instead of a DB query — zero additional queries.

**Field permissions:** Similarly, load all `field_permissions` rows for the user's dept_keys once and cache on `UserContext`:
```python
field_write_map: dict[tuple[str, str], Optional[str]]  # (field_key, dept_key) → level_key
```

This eliminates per-field DB queries in `check_field_write_scope()`.

### B4. `check_field_write_scope()` — doc_badge awareness

Updated logic with level awareness:

```python
LEVEL_ORDER = {"l1": 1, "l2": 2, "l3": 3}

def check_field_write_scope(user: UserContext, field_name: str, db: Session) -> bool:
    for role in user.roles:
        if role.dept_key == "mgmt":
            return True

        # Check field_permissions for (field_key, dept_key) match
        match = user.field_write_map.get((field_name, role.dept_key))
        if match is not None:
            required_level, = match  # level_key or None
            if required_level is None:
                return True  # All levels allowed
            if LEVEL_ORDER.get(role.level_key, 0) >= LEVEL_ORDER.get(required_level, 0):
                return True  # User's level meets or exceeds requirement
    return False
```

**Effect on doc badge fields:**
- ops l1 calling `update_site()` with `wcc_status` → field_permissions has `(wcc_status, ops, NULL)` → level check passes → **allowed**
- ops l1 calling `update_site()` with `height` → field_permissions has `(height, ops, l2)` → l1 < l2 → **denied**
- ops l2 calling `update_site()` with `height` → l2 >= l2 → **allowed**

### B5. Data Scoping on List Endpoints

#### Sites — already partially scoped
Current: FO users only see sites they're assigned to (via `_site_accessible_to_fo`). Ops/mgmt see all sites within a project.
No change needed — project-level scoping is already enforced by the route `GET /sites/{project_key}` and `check_permission` with `project_key`.

#### Transactions — needs scoping

Current: `GET /transactions` returns ALL transactions. No user/project filtering.

New logic in `list_transactions()`:
```python
def list_transactions(db: Session, user: UserContext) -> list[dict]:
    query = select(Transaction)

    if user.is_fo:
        # FO sees only their own transactions (recipient_id = user_id)
        query = query.where(Transaction.recipient_id == user.user_id)
    else:
        # Get user's assigned project IDs
        project_ids = _user_project_ids(user, db)
        if project_ids is not None:
            # Non-global users: filter by assigned projects
            query = query.where(Transaction.project_id.in_(project_ids))
        # Global users (mgmt, acc): no filter, see all

    return [model_to_dict(row) for row in db.execute(query).scalars().all()]
```

Helper:
```python
def _user_project_ids(user: UserContext, db: Session) -> Optional[list[int]]:
    """Returns list of project IDs for project-scoped users, or None for global-scope users."""
    if any(role.global_scope for role in user.roles):
        return None  # Global scope — see all projects
    return list({role.project_id for role in user.roles if role.project_id is not None})
```

The `user: UserContext` parameter must be threaded from the route handler through to the service function (currently missing).

#### Tickets — needs scoping

Current: `GET /tickets` returns ALL tickets. Uses `permission_required("site", "read")` — wrong tag.

Changes:
1. Change permission tag from `"site"` to `"ticket"`
2. Add user-based scoping:

```python
def list_all_tickets(db: Session, user: UserContext) -> list[dict]:
    # FO users cannot see tickets (no ticket tag) — enforced by permission_required("ticket", "read")
    # Ops users: filter by assigned project IDs
    query = select(Ticket)
    project_ids = _user_project_ids(user, db)
    if project_ids is not None:
        query = query.where(Ticket.project_id.in_(project_ids))
    return [model_to_dict(row) for row in db.execute(query).scalars().all()]
```

#### Sidebar counts endpoint

`GET /projects/counts` returns `{ transactions: N, tickets: N }`. This must also apply the same scoping filters so counts match what the user actually sees.

### B6. Frontend `hasPermission()` elimination

The frontend `hasPermission()` in `lib/auth.ts` currently hardcodes dept_key checks. Once `/auth/me` returns `tags`, this function becomes a simple lookup:

```typescript
export function hasPermission(tags: TagMap, tag: string, action: "read" | "write"): boolean {
  const entry = tags[tag]
  if (!entry) return false
  return action === "read" ? entry.read : entry.write
}
```

No dept_key logic needed — the backend already computed the union of permissions.

---

## C. Frontend Changes

### C1. AuthContext — New Shape

Current `AuthContextValue`:
```typescript
type AuthContextValue = {
  user: AuthUser | null
  roles: AuthRole[]
  loading: boolean
  login, logout, refreshAuth, can
}
```

New additions:
```typescript
type TagPermission = { read: boolean; write: boolean }
type TagMap = Record<string, TagPermission>

type AuthContextValue = {
  user: AuthUser | null
  roles: AuthRole[]
  tags: TagMap              // NEW — from /auth/me
  projectKeys: string[]     // NEW — from /auth/me
  loading: boolean
  login, logout, refreshAuth, can
}
```

The `tags` and `projectKeys` are populated from the `/auth/me` response and stored in localStorage alongside `auth_user` and `auth_roles`.

### C2. Sidebar.tsx — Pure Tag Checks

**Delete all of these:**
```typescript
const depts = new Set(roles.map((r) => r.dept_key))
const isMgmt = depts.has("mgmt")
const isAcc = depts.has("acc")
// ... all dept checks
const canSeePeople = isMgmt || isHr
const canSeeProjectAdmin = isMgmt
// ... etc
```

**Replace with:**
```typescript
const { tags, projectKeys } = useAuth()

const canTag = (tag: string) => tags[tag]?.read === true
```

Sidebar visibility mapping:

| Nav Item | Condition |
|----------|-----------|
| Dashboard | Always visible (all authenticated users) |
| People | `canTag("people")` |
| Projects (admin) | `canTag("project")` |
| Project Modules | `canTag("site")` AND project.key is in `projectKeys` |
| Transactions | `canTag("transaction")` |
| Tickets | `canTag("ticket")` |
| Rate Card | `canTag("rate_card")` |
| Billing (PO, Invoice) | `canTag("billing")` |

**Project Modules filtering:**

Current code shows all projects from `GET /projects` filtered by `project.recurring`. Must additionally filter by `projectKeys`:

```typescript
projects
  .filter((p) => p.recurring && projectKeys.includes(p.key))
  .map((project) => ...)
```

This ensures Babita (assigned MI, MD) only sees MI and MD modules. Sonal (assigned MA, MC) only sees MA and MC.

### C3. TransactionsPage — Filter by AuthContext

Current: fetches all transactions, displays all.

After backend scoping is implemented, the backend will already return only the transactions the user is allowed to see. The frontend doesn't need additional filtering — the API response is pre-scoped.

However, the frontend should remove the hardcoded `isAccUser` check:
```typescript
// DELETE this
const isAccUser = roles.some((r) => r.dept_key === "acc")
```

Replace with:
```typescript
const { tags } = useAuth()
const canWriteTransaction = tags.transaction?.write === true
```

Use `canWriteTransaction` instead of `isAccUser` to gate the status dropdown.

### C4. TicketsPage — same pattern

Backend returns pre-scoped tickets. Frontend uses `canTag("ticket")` for visibility. No dept_key checks.

### C5. Doc Badge Fields — Frontend Rendering

The `doc_badge` tag in `tags` determines how doc badge fields render:

```typescript
const { tags } = useAuth()
const docBadgeEditable = tags.doc_badge?.write === true
const docBadgeVisible = tags.doc_badge?.read === true
```

In `SiteDetailPage.tsx`, for fields `wcc_status`, `fsr_status`, `tx_copy_status`, `report_status`:
- If `!docBadgeVisible` → hide the field entirely
- If `docBadgeVisible && !docBadgeEditable` → render as read-only badge
- If `docBadgeEditable` → render as editable dropdown

This replaces any hardcoded dept_key check for doc badge rendering.

---

## D. Migration Plan

### Migration 1: Add `level_key` to `field_permissions`

```
ALTER TABLE schema_core.field_permissions ADD COLUMN level_key VARCHAR(32) DEFAULT NULL;
```

Update existing ops field_permission rows (ids 1-22 + provider_id row) to set `level_key = 'l2'`.

Doc badge field rows (`wcc_status`, `fsr_status`, `report_status` for acc dept) remain `level_key = NULL`.

Add new doc badge field_permission rows for ops:
- `(wcc_status, ops, NULL)`
- `(fsr_status, ops, NULL)`
- `(report_status, ops, NULL)`

Add `tx_copy_status` rows if the field exists in the site models:
- `(tx_copy_status, ops, NULL)`

### Migration 2: Seed new permission tags

Insert the new `ticket`, `people`, `rate_card`, `doc_badge` tag rows (ids 63-88 as listed in section A3).

**Existing data preserved:** All 62 existing permission_tag rows remain untouched. New rows are additive.

### Migration 3: Backend code changes (no migration, code-only)

1. Update `UserContext` with `permission_map` and `field_write_map`
2. Update `_load_user_context()` to preload permissions
3. Delete `ROLE_ACTION_RULES` dict
4. Update `check_permission()` to use `permission_map`
5. Update `check_field_write_scope()` with level awareness
6. Update `/auth/me` to return `tags` and `project_keys`
7. Thread `UserContext` into `list_transactions()` and `list_all_tickets()`
8. Add scoping logic to both services
9. Change tickets route permission tag from `"site"` to `"ticket"`
10. Update `/projects/counts` to apply same scoping

### Migration 4: Frontend code changes (no migration, code-only)

1. Update `AuthContext` to store `tags` and `projectKeys` from `/auth/me`
2. Update `hasPermission()` in `auth.ts` to use tag map lookup
3. Rewrite Sidebar.tsx visibility using `canTag()` pattern
4. Filter project modules by `projectKeys`
5. Replace `isAccUser` in TransactionsPage with `tags.transaction.write`
6. Add doc_badge read/write checks in SiteDetailPage

### Execution Order

```
Migration 1 (DB: field_permissions level_key)
    ↓
Migration 2 (DB: new permission tag rows)
    ↓
Backend code changes (auth.py, routes, services)
    ↓
Frontend code changes (AuthContext, Sidebar, pages)
```

DB migrations first so the backend code can immediately query the new data. Backend before frontend so `/auth/me` returns the new shape before the frontend consumes it.

---

## Ambiguities Requiring Input

### 1. `tx_copy_status` field
The doc_badge spec mentions `tx_copy_status` but I don't see this field in any site model or in the current `field_permissions` seed. Does this field exist? If not, does it need to be added to specific project schemas (which ones)?

### 2. FO transaction visibility — "own transactions"
The requirement says FO users see "only their own transactions." Currently `Transaction` has a `recipient_id` field. Should "own" mean `recipient_id = user_id`? Or should it mean transactions for sites the FO is assigned to?

### 3. Ticket model — project_id column
The scoping logic assumes `Ticket` has a `project_id` column. Need to confirm this exists in the ticket model.

### 4. `rate_card` vs `rate` tag
The existing permission_tags have a `rate` tag. The new design adds `rate_card`. Should the existing `rate` tag be renamed to `rate_card`, or should both coexist with different purposes? My recommendation: keep `rate` for backend write permission on rate card entries, add `rate_card` purely for sidebar visibility. But this creates two tags for one resource — your call.

### 5. BB project and FO
BB has no FE assignments, so the FO transaction/site scoping via `FEAssignment` won't work for BB. Is this intentional (FOs never interact with BB), or does BB need a different scoping mechanism?

### 6. Mgmt doc_badge write
The seed data gives mgmt `doc_badge.write = false`. The spec says "view only." But mgmt currently bypasses `check_field_write_scope()` entirely (line 121-122 in auth.py). If mgmt should NOT write doc badge fields, the bypass needs a carve-out. If mgmt SHOULD write them (as the bypass implies), then `doc_badge.write = true` for mgmt. Which is correct?

### 7. Sidebar counts — performance
`GET /projects/counts` will now need per-user scoping (join on user_roles for project filtering). This may be slower. Is it acceptable, or should counts be dropped from the sidebar?
