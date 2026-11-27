# DESIGN.md — Warehouse Management System (UI)

Day 1 draft (Fri 27 Nov 2026). Updated as the build progresses; deferred work
is listed honestly at the end.

## Interpretation of the brief

- 5×5 grid, columns A–E, rows 1–5. A1 is a transfer point, not storage; the
  other 24 locations each hold at most one pallet.
- Load = palletise at A1, shuttle moves the pallet to the destination; the
  operation completes immediately (no animation, no hardware simulation).
- Unload = shuttle returns the pallet to A1 and it leaves warehouse stock —
  there is no separate "clear A1" step.
- Roles: admin (everything + user admin), auditor (read-only + dashboard),
  technician (load/unload). The backend enforces permissions; the UI only
  reflects them (hides controls/links, shows access-denied on direct routes).

## Architecture

- React 18 + Vite + TypeScript, `react-router-dom` for routing, plain CSS
  (no component library — the UI is small and this keeps the bundle and the
  interview walkthrough simple).
- `src/api.ts` — one fetch client: base-URL resolution, JWT header, typed
  request helpers per endpoint, `ApiError` carrying the API's `detail`
  string so the UI shows the server's exact failure reason.
- `src/auth.tsx` — auth context: login/logout, user + role from
  `localStorage` (`wms_access_token`, `wms_refresh_token`, `wms_user`).
  The access token is sent as `Authorization: Bearer <token>`. A 401 clears
  auth and the user must log in again (no silent refresh — see limitations).
- `src/pages/` — Login, Map, Shuttle, Dashboard, AdminUsers.
  `src/components/LoadDialog.tsx` — the load form.
- State is local to each page (`useState`/`useEffect`); no global store is
  needed at this size. The map polls `GET /api/map/` every 3 s so changes
  from another session appear within the brief's 5 s limit.

## API contract (agreed with the parallel Django build)

Base URL from `VITE_API_BASE_URL` → `REACT_APP_API_BASE_URL` →
`API_BASE_URL` → `http://127.0.0.1:8000` (see `src/api.ts`).

- `POST /api/auth/login/` → `{access, refresh, user: {username, role}}`
- `GET /api/map/` → `{locations: [{code, is_transfer_point, occupied, pallet}]}`
- `POST /api/load/` → 201; 400 `{detail}` on occupied destination, A1 as
  destination, duplicate pallet number, bad quantity
- `POST /api/unload/ {location}` → 200; 400 when free / A1 / invalid
- `GET /api/shuttle/` → `{identifier, status, battery_percent}`
- `GET /api/dashboard/` → `{occupied, free, history: [{date, occupied, free}] × 7, pallets}`
- `GET /api/admin/users/` (+ POST/PATCH/DELETE) — admin only
- `GET /health/` → `{status: "ok"}` (no auth)

## Validation and failure handling

- Client-side: quantity must be a positive integer; destination is a
  dropdown of currently free locations only (A1 never offered). These are
  convenience checks — the API is the authority and its 400 `detail` is
  displayed verbatim on failure (e.g. a location filled by another session
  between poll and submit).
- Load/unload always refresh the map on success and show a success notice;
  on failure the map is left as-is and the error is shown.
- If the API is unreachable, pages show a plain error instead of a spinner
  that never resolves.

## Historical chart

The dashboard's 7-day chart shows end-of-day occupied/free counts out of
24 storage locations, supplied by the API as reproducible seeded history
(`history[].date/occupied/free`); the current day's bar uses the live
counts. Rendered as plain div bars — no chart library dependency. The exact
seeding rule lives in the API repo's seed command; the UI only renders what
the API returns.

## Assumptions

- One shuttle only (the brief says "one shuttle").
- Pallet numbers are unique across the warehouse (API enforces it).
- Quantity is a whole number ≥ 1; no unit is modelled (the brief gives no
  unit).
- Demo usernames are shown on the login page; passwords are never in the
  repo, docs, or logs.

## Trade-offs

- Plain CSS over a component library: less code to explain in the follow-up
  interview, sufficient for five pages.
- Polling (3 s) over websockets: satisfies the 5 s requirement with the
  simplest possible mechanism.
- No token refresh: keeps auth simple for Day 1; a 401 returns the user to
  login. Acceptable for an assessment demo, noted as a limitation.

## Deferred work (Day 2, Mon 30 Nov)

- Playwright tests: one happy-path test minimum (login as technician, load
  a pallet, map shows it occupied), plus role-gating and failure cases.
  Config + `npm test` wiring already exist; no test files yet.
- Admin user edit / password reset / delete.
- Deployment (Vercel UI + Render API) and hosted end-to-end verification.
- Fresh-clone verification pass before submission.
