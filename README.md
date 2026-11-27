# Warehouse Management System — UI

React 18 + Vite + TypeScript frontend for the IIT Bombay design-round
Warehouse Management System. The warehouse is a 5×5 grid (columns A–E,
rows 1–5); A1 is the transfer point and the other 24 locations each hold one
pallet. Technicians load/unload pallets, auditors inspect occupancy on a
dashboard, admins manage users.

- **API repository:** (link added when the API repo is created — built in
  parallel at `~/workspace/iitb-warehouse-api/`; see `DESIGN.md`)
- **Hosted UI / API:** not deployed yet (deployment is planned for Mon 30 Nov)
- **Design decisions:** [`DESIGN.md`](DESIGN.md)
- **AI usage:** [`AI_USAGE.md`](AI_USAGE.md)

## Supported runtimes

- Node.js **24** (developed and verified on Node v24.22.1, npm 10.9.4)

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

The API must be running separately — see the API repo README for
`python manage.py migrate`, `seed_demo`, and `runserver`. The UI talks to it
over HTTP and stores the JWT access token in `localStorage`.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | API base URL (first priority) | `http://127.0.0.1:8000` |
| `REACT_APP_API_BASE_URL` | API base URL (second priority) | — |
| `API_BASE_URL` | API base URL (third priority) | — |
| `HOST` / `PORT` | Dev server bind address / port | `127.0.0.1` / `5173` |
| `UI_BASE_URL` / `BASE_URL` | UI URL under test (Playwright) | `http://127.0.0.1:5173` |
| `PLAYWRIGHT_JSON_OUTPUT_FILE` | Playwright JSON report path | — |

## Tests

```bash
npm test   # Playwright, Chromium (default non-interactive command)
```

Day 1 status: the Playwright config and `npm test` wiring exist, but no test
files are written yet — that is Day 2 (Mon 30 Nov). Running `npm test` now
reports "No tests found" rather than failing on config. The planned suite
(login as technician → load a pallet → map shows it occupied, plus role and
failure cases) is described in `DESIGN.md`.

## Demo accounts

- `demo_admin` (admin), `demo_auditor` (auditor), `demo_technician`
  (technician). Passwords are supplied separately by the assessment
  coordinator and are **never** in this repository. The login page lists the
  usernames only, without passwords.

## Features (Day 1)

- Login (JWT, role stored with the token), role-gated navigation
- Warehouse map: 5×5 grid, green free / red occupied + text labels in every
  cell, A1 visually distinct as the transfer point, pallet details on click,
  polling every 3 s so other sessions' changes appear within 5 s
- Load dialog (technician/admin): pallet number, barcode, item, quantity,
  destination dropdown of currently free locations (never A1); API errors
  shown verbatim
- Unload from an occupied cell's detail panel (technician/admin)
- Shuttle status page (all roles): identifier, status, battery %
- Auditor dashboard (auditor/admin): occupied/free counts, 7-day occupancy
  chart (plain div bars, no chart library), stocked-pallets table;
  technicians see an access-denied message on the route directly
- Admin users page (admin): user list + create-user form (edit/delete Day 2)

## Known limitations

- Admin user edit / password reset / delete are not built yet (Day 2).
- No Playwright tests yet (Day 2).
- The UI does not refresh the JWT; an expired session returns to login.
- Not deployed yet; local use only until the Mon 30 Nov deployment step.
