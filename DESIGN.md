# DESIGN.md — Warehouse Management System

Final (Sat 28 Nov 2026). Every claim below matches the submitted code;
verification results are in the [README](README.md).

## Interpretation of the brief

- 5×5 grid, columns A–E, rows 1–5. **A1 is the transfer point, not
  storage**; the other 24 locations each hold at most one pallet.
- **Load** = palletise at A1, shuttle moves the pallet to the selected
  destination; the operation completes immediately (no animation, no
  hardware simulation, per the brief).
- **Unload** = shuttle returns the pallet to A1 and it leaves warehouse
  stock — there is no separate "clear A1" step. The pallet row is kept
  in the database with its location cleared, so history is preserved;
  the pallet number is never reused.
- **Roles:** admin (everything + user administration), auditor
  (read-only + dashboard), technician (load/unload). Permissions are
  enforced on the **backend**; the UI only reflects them (hides
  controls/links, shows an access-denied page on direct routes).
- **Map freshness:** changes made in another session must appear
  within 5 s. The map polls `GET /api/map/` every 3 s.
- The application must be usable on desktop and mobile screens.

## Architecture

```
iitb-warehouse-ui (React 18 + Vite 6 + TypeScript, react-router-dom, plain CSS)
        │  fetch, JWT in Authorization: Bearer <token>
        ▼
iitb-warehouse-api (Django 5.1 + DRF + SimpleJWT)
        │
        ▼
SQLite locally (SQLITE_PATH) · Postgres on Render (DATABASE_URL)
```

- **UI, `src/api.ts`** — one fetch client: base-URL resolution
  (`VITE_API_BASE_URL` → `REACT_APP_API_BASE_URL` → `API_BASE_URL` →
  `http://127.0.0.1:8000`), JWT header, typed request helpers per
  endpoint, `ApiError` carrying the API's `detail` string so the UI
  shows the server's exact failure reason.
- **UI, `src/auth.tsx`** — auth context: login/logout, user + role
  from `localStorage`. A 401 clears auth and the user must log in
  again (no silent refresh — see limitations).
- **UI, `src/pages/`** — `LoginPage`, `MapPage`, `ShuttlePage`,
  `DashboardPage`, `AdminUsersPage`; `src/components/LoadDialog.tsx`
  — the load form. State is local to each page
  (`useState`/`useEffect`); no global store is needed at this size.
- **API, `warehouse/`** — `models.py`, `views.py`, `serializers.py`,
  `permissions.py`, `urls.py`, plus the `seed_demo` management
  command. `config/settings.py` reads all deployment configuration
  from environment variables.
- No component library: the UI is five pages, and plain CSS keeps the
  bundle and the follow-up interview walkthrough simple.

## Data model (API)

| Model | Purpose |
| --- | --- |
| `Location` | 25 rows, codes A1–E5; `is_transfer_point` is true only for A1. Occupancy is **derived, never stored**: a location is occupied iff a pallet points at it. |
| `Pallet` | `pallet_number` (unique across all time), `barcode`, `item`, `quantity`, `location` (nullable FK). Unloading sets `location` to null; the row is kept. |
| `Shuttle` | One row (`SH-01`, status, battery %); read-only via the API. |
| `OccupancySnapshot` | One row per day for the 7-day dashboard history. |
| `Profile` | One row per user, carrying the role (`admin` / `auditor` / `technician`). Users created without a profile default to technician on first login. |

## API contract

Base URL from the resolution order above (see `src/api.ts`).

| Method & path | Roles | Behaviour |
| --- | --- | --- |
| `GET /health/` | public | `{"status": "ok"}` — readiness check, no auth. |
| `POST /api/auth/login/` | public | `{username, password}` → `{access, refresh, user: {username, role}}`; wrong credentials → 401. |
| `GET /api/map/` | any authenticated | 25 locations with `code`, `is_transfer_point`, `occupied`, and `pallet` (null or pallet details). |
| `POST /api/load/` | technician, admin | 201 with the created pallet. 400 when: destination is A1, destination code invalid, destination occupied, pallet number already exists, quantity ≤ 0 / missing / invalid, or a required field is missing. |
| `POST /api/unload/` | technician, admin | 200. 400 when the location is free, is A1, or the code is invalid. |
| `GET /api/shuttle/` | any authenticated | `{identifier, status, battery_percent}` from the database. |
| `GET /api/dashboard/` | auditor, admin | `{occupied, free, history: [{date, occupied, free}] × 7, pallets}` — `pallets` are the currently stocked pallets with their location. |
| `GET /api/admin/users/` | admin | List users with roles. |
| `POST /api/admin/users/` | admin | `{username, password, role}` → 201. |
| `PATCH /api/admin/users/<id>/` | admin | `{role and/or password}`. Refused (400) when demoting the last admin. |
| `DELETE /api/admin/users/<id>/` | admin | 204. Refused (400) when deleting the last admin or your own account. |

Wrong role → 403; no/invalid token → 401. Enforcement is in
`warehouse/permissions.py` (`IsAdmin`, `IsTechnicianOrAdmin`,
`IsAuditorOrAdmin`) applied on every view, not only in the UI.

## Workflows and permissions

| Workflow | Who | Backend | UI |
| --- | --- | --- | --- |
| View map, pallet details, shuttle status | all roles | `IsAuthenticated` | all nav links visible |
| Load / unload | technician, admin | `IsTechnicianOrAdmin` (403 otherwise) | Load button and Unload control hidden from auditors; API error shown verbatim on failure |
| Auditor dashboard | auditor, admin | `IsAuditorOrAdmin` (403 otherwise) | dashboard link hidden from technicians; direct route shows "Access denied" |
| User administration | admin | `IsAdmin` (403 otherwise) | admin link hidden from non-admins; direct route shows "Access denied" |

## Validation and failure handling

- **Client-side (convenience only):** quantity must be a positive
  integer; the destination is a dropdown of currently free locations
  only (A1 never offered). The API is the authority: its 400 `detail`
  is displayed verbatim on failure — for example when another session
  fills the chosen location between the map poll and the submit.
- Load/unload refresh the map on success and show a success notice;
  on failure the map is left as-is and the error is shown.
- If the API is unreachable, pages show a plain error instead of a
  spinner that never resolves.
- **Seed safety:** `seed_demo` is idempotent — re-running it never
  duplicates demo users, locations, the shuttle, history snapshots or
  sample pallets, and never deletes non-demo data. Existing demo users
  are updated in place, so changing `EVAL_*` values and re-running the
  seed applies the new password. There is no destructive reset command.

## The historical chart

The dashboard's 7-day chart shows end-of-day occupied/free counts out
of the **24 storage locations** (A1 is never counted). The API supplies
it as `history[].date/occupied/free`:

- The **six days before today** are fixed, deterministic seeded values:
  occupied `[2, 4, 3, 5, 4, 6]` out of 24; `free = 24 − occupied`.
  They are sample data, reproducible on every fresh seed — they do not
  come from real warehouse activity, and the chart's meaning is exactly
  "how many of the 24 storage locations were occupied at the end of
  that day".
- **Today's bar uses the live counts** — the seed sets today's row to
  the actual current stocked count, so the chart's last point always
  agrees with the live occupied/free counts shown above it.
- The UI renders the chart as plain div bars from the API data; it does
  not compute or invent history itself.

Seeded sample stock on a fresh database is 5 pallets (at A3, B2, C3, D1,
E4), so a fresh demo opens with 5 occupied / 19 free.

## Deployment topology

- **Hosted UI:** Render static site from `iitb-warehouse-ui`, build
  `npm install && npm run build`, publish `dist`, with
  `VITE_API_BASE_URL=https://iitb-warehouse-api.onrender.com` baked in
  at build time.
- **Hosted API:** Render Python web service from
  `iitb-warehouse-api`; start command runs `migrate --noinput` and
  `seed_demo`, then serves with gunicorn.
- **Hosted database:** Render Postgres, connected through
  `DATABASE_URL` (parsed by `dj-database-url` in
  `config/settings.py`). The hosted demo accounts are seeded from
  `EVAL_*` environment variables set on the Render service; the
  passwords are disposable, distinct per role, and appear only in the
  submission form — never in a repository or document.
- **Local evaluation:** SQLite, honouring `SQLITE_PATH`; the API runs
  with `runserver 127.0.0.1:<port> --noreload`. The models and API are
  identical in both environments; only the database engine, the server
  (runserver vs gunicorn) and the base URLs differ. The API repository
  carries `evaluation.json` (`env`, `setup_commands:
  ["python manage.py seed_demo"]`, `ready_path: "/health/"`).

## Assumptions

- One shuttle only (the brief says "one shuttle"); its status and
  battery are seeded values (`SH-01`, `idle`, `87`) and are read-only.
- Pallet numbers are unique across all time, including pallets already
  unloaded (the API rejects a re-used number).
- Quantity is a whole number ≥ 1; no unit is modelled (the brief gives
  no unit).
- Demo usernames are shown on the login page; passwords are never in
  the repo, docs, or logs.

## Trade-offs

- **Polling (3 s) over websockets:** satisfies the 5 s requirement
  with the simplest possible mechanism; no persistent connection to
  maintain on a free tier.
- **Plain CSS over a component library:** less code to explain in the
  follow-up interview, sufficient for five pages.
- **No token refresh:** keeps auth simple; a 401 returns the user to
  login. Acceptable for an assessment demo, noted as a limitation.
- **Occupancy derived, not stored:** a location's state can never
  drift out of sync with the pallets table; the cost is a join per map
  read, trivial at this scale.
- **Chart as plain div bars:** no charting dependency for seven bars.

## Deferred work / known limitations

- No JWT refresh (see above); no pagination on the admin user list.
- The shuttle has no status-editing endpoint (explicitly out of scope
  per the brief).
- No API-only test suite: the Playwright suite in this repository
  exercises the API over HTTP (see README). A dedicated API suite was
  not needed to verify the endpoints — they were checked with live
  curl calls (see the API README).
- Render free-tier sleep: the hosted API can take ~30–60 s to answer
  the first request after idle time. This is documented in the README
  and reported as a deployment limitation in the submission.
