# Warehouse Management System — UI

React 18 + Vite 6 + TypeScript frontend for the IIT Bombay design-round
Warehouse Management System. The warehouse is a 5×5 grid (columns A–E,
rows 1–5); A1 is the transfer point and the other 24 locations each hold
one pallet. Technicians load/unload pallets, auditors inspect occupancy
on a dashboard, admins manage users. The backend enforces all
permissions; this UI reflects them (hides controls, shows access-denied
on direct routes).

- **API repository:** https://github.com/Deveshsanap/iitb-warehouse-api
  (setup README there: Python 3.12, Django 5.1 + Django REST Framework)
- **Hosted UI:** https://iitb-warehouse-ui.onrender.com
- **Hosted API:** https://iitb-warehouse-api.onrender.com
- **Browser login URL:** https://iitb-warehouse-ui.onrender.com/login
- **Design decisions:** [`DESIGN.md`](DESIGN.md)
- **AI usage:** [`AI_USAGE.md`](AI_USAGE.md)

## Supported runtimes

- Node.js **18+** (developed and verified on Node v24.22.1, npm 10.9.4)

## Setup

```bash
npm install
cp .env.example .env   # optional; defaults point at the local API
npm start
```

`npm start` honours `HOST` and `PORT` (defaults `127.0.0.1` and `5173`):

```bash
HOST=127.0.0.1 PORT=5173 npm start
```

The API must be running separately — see the
[API README](https://github.com/Deveshsanap/iitb-warehouse-api#readme)
for `python manage.py migrate --noinput`, `python manage.py seed_demo`
and `python manage.py runserver 127.0.0.1:8000 --noreload`. The UI talks
to it over HTTP and stores the JWT access token in `localStorage`
(`wms_access_token`, `wms_refresh_token`, `wms_user`).

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | API base URL (first priority) | `http://127.0.0.1:8000` |
| `REACT_APP_API_BASE_URL` | API base URL (second priority) | — |
| `API_BASE_URL` | API base URL (third priority) | — |
| `HOST` / `PORT` | Dev server bind address / port | `127.0.0.1` / `5173` |
| `UI_BASE_URL` / `BASE_URL` | UI URL under test (Playwright) | `http://127.0.0.1:5173` |
| `PLAYWRIGHT_JSON_OUTPUT_FILE` | Playwright JSON report path | — |

The hosted UI is built with `VITE_API_BASE_URL` set to the hosted API
URL, so the deployed frontend talks to the deployed API. Locally the
default points at `http://127.0.0.1:8000`.

## Tests

```bash
npm test   # Playwright, Chromium (default non-interactive command)
```

The suite exercises the running local UI and API in headless Chromium
(the evaluator starts both servers; there is no `webServer` in
`playwright.config.ts`). Credentials come from the evaluator-supplied
`EVAL_*` variables when present; the fallbacks are the documented
local-dev defaults from the API seed command (username as password,
local use only — never real hosted passwords). The Playwright config
uses the full JSON reporter, honouring `PLAYWRIGHT_JSON_OUTPUT_FILE`.

**Result, run 28 Nov 2026 against the local UI + API: 4 passed,
0 failed, 0 skipped (15.6 s).**

| File | Test | Covers |
| --- | --- | --- |
| `tests/e2e.spec.ts` | Technician loads a pallet and the map shows it occupied | Happy path: login → Load dialog → map cell occupied with the pallet number → detail panel shows pallet details |
| `tests/e2e-smoke.spec.ts` | Technician loads a pallet and unloads it again | Load/unload round-trip; the same cell is free again afterwards |
| `tests/e2e-smoke.spec.ts` | Auditor sees no load/unload controls; technician is denied the dashboard | Role gating in the UI: auditor can inspect a seeded pallet but gets no Unload control; technician hitting `/dashboard` or `/admin` gets a clean "Access denied" page |
| `tests/e2e-smoke.spec.ts` | Admin can create, edit, reset and delete a user | Admin user lifecycle end to end: create → role change → password reset (verified by logging in with the new password) → last-admin demote guard refuses → delete |

No tests are skipped and none are failing. The API was separately
verified over HTTP on 27–28 Nov 2026 (see the API README): health 200,
login for all three roles, load 201 / occupied destination 400 /
auditor load 403, unload 200, dashboard auditor-only, unauthenticated
map 401.

## Demo accounts

- `demo_admin` (admin), `demo_auditor` (auditor), `demo_technician`
  (technician). Passwords are supplied separately with the submission
  and are **never** in this repository. The login page lists the
  usernames only, without passwords.

## Features

- Login (JWT, role stored with the token), role-gated navigation
- Warehouse map: 5×5 grid, green free / red occupied + text labels in
  every cell, A1 visually distinct as the transfer point, pallet
  details on click, polling every 3 s so other sessions' changes
  appear within the brief's 5 s limit; responsive layout for mobile
- Load dialog (technician/admin): pallet number, barcode, item,
  quantity, destination dropdown of currently free locations (never
  A1); API errors shown verbatim
- Unload from an occupied cell's detail panel (technician/admin)
- Shuttle status page (all roles): identifier, status, battery %,
  read from the database
- Auditor dashboard (auditor/admin): occupied/free counts, 7-day
  occupancy chart (plain div bars, no chart library), stocked-pallets
  table; technicians see an access-denied message on the route
- Admin users page (admin): user list, create user, per-row role
  change, password reset, and delete (with a confirm dialog; deleting
  your own account or the last admin is refused by the API)

## Known limitations

- The UI does not refresh the JWT; an expired session returns to login.
- Hosted demo runs on Render's free tier: the API service sleeps after
  inactivity, so the first load after idle time can take ~30–60 s
  (cold start). The UI is a static site and does not sleep.
- No pagination on the admin user list (fine at this scale).
- The shuttle status is read-only in the UI (no status editing,
  explicitly out of scope per the brief).
- The 7-day chart is plain div bars, not a charting library.
