# AI_USAGE.md — Warehouse Management System

## Tools used

- **Muse (Meta's AI coding agent)** — my AI assistant for this
  assessment. No other AI tools were used.
- I specified the requirements from the brief, wrote the build plan,
  and directed the work step by step: API contract first, then the UI
  pages, then the Playwright tests, then deployment. The agent worked
  under that direction; I reviewed what it produced and verified the
  results by running the checks below.

## Tasks the AI supported

- **Planning:** turned the brief into a build plan (API contract,
  data model, role rules, test approach) from my requirements.
- **API implementation:** Django + DRF project, models, JWT auth,
  role permissions, load/unload/map/shuttle/dashboard/admin
  endpoints, the idempotent `seed_demo` command, and the Postgres
  deployment wiring (`DATABASE_URL`, gunicorn).
- **UI implementation:** project scaffolding (`package.json`,
  `vite.config.ts`, `tsconfig.json`, `playwright.config.ts`,
  `.env.example`), the API client, auth context, routing with role
  gating, the five pages (Login, Map, Shuttle, Dashboard, Admin
  Users), the Load dialog, and responsive CSS.
- **Tests:** the Playwright suite in `tests/` (happy-path test plus
  the load/unload, role-gating and admin lifecycle tests).
- **Documentation:** drafts of `README.md`, `DESIGN.md` and this
  file, which I checked against the actual code before submission.
- **Deployment preparation:** Render service configuration and the
  environment-variable list for the hosted demo.

## How I checked the outputs

Everything below was actually executed — no result here is claimed
from a plan or a dry run.

- **Type-check and build:** `npx tsc --noEmit` and `npm run build`
  run clean (28 Nov 2026, after the final documentation edits).
- **API over HTTP (27–28 Nov 2026):** `GET /health/` 200 without
  auth; login 200 for all three demo roles; `GET /api/map/` returns
  25 locations with the 5 seeded pallets; `POST /api/load/` 201, then
  400 on an occupied destination and 403 for the auditor; `POST
  /api/unload/` 200; `GET /api/shuttle/` returns the seeded shuttle;
  `GET /api/dashboard/` works for the auditor and returns 403 for the
  technician; unauthenticated `GET /api/map/` returns 401.
- **Playwright (28 Nov 2026):** `npm test` against the running local
  UI + API — **4 passed, 0 failed, 0 skipped (15.6 s)**: the
  happy-path test plus the three rehearsal tests (load/unload
  round-trip, role gating, admin create/edit/reset/delete). The
  browser end-to-end rehearsal in headless Chromium also passed 3/3
  the same day.
- **Seed idempotency:** `seed_demo` run twice on a fresh database —
  no duplicate demo users, locations, shuttle, history or pallets.
- **Docs against code:** I read the code behind every claim in
  `README.md` and `DESIGN.md` (routes, permission classes, polling
  interval, seed values, history rule) before finalising them. The
  hosted URLs in the README are the Render service URLs for this
  submission.

## Corrections the checking found

- **Two test bugs, not app bugs (28 Nov):** a regex in the rehearsal
  spec excluded column A from destinations, and one assertion expected
  the seeded pallet PLT-1002 at B2 when it is at C3. Both were fixed
  in the test and the suite re-ran green.
- **One API bug (27 Nov):** `PATCH /api/admin/users/<id>/` returned
  the stale role after a role change. Fixed in the API; the admin
  role-change test now verifies the new role.
- **One deployment gap (28 Nov):** the API initially had no Postgres
  support — only SQLite. I had the agent wire `DATABASE_URL` via
  `dj-database-url` with `psycopg`, and add `gunicorn`, before the
  Render deploy. The change was verified with `manage.py check`,
  `migrate` on a fresh database, and a config check of gunicorn.

## What the AI did not do

- It did not choose the product decisions: the grid interpretation,
  the derived-occupancy rule, the A1 rule, the deterministic history
  values, the polling approach, and the role model were my decisions
  from the brief, recorded in `DESIGN.md`.
- It did not supply any hosted credentials: the demo passwords are
  disposable values I generated for the submission form only, and they
  appear nowhere in the repositories or documentation.
- It did not submit the form. The submission is mine.

## Remaining uncertainty

- I have no prior hands-on TypeScript, Django or Playwright
  experience. I directed and reviewed this build, and I am doing a
  file-by-file walkthrough of the submitted code before the follow-up
  interviews so I can navigate it, explain each decision, and make
  small changes without AI assistance.
- The hosted demo runs on Render's free tier, so the API sleeps after
  inactivity (first request after idle time can take ~30–60 s). That
  is a property of the free tier, not a code defect, and it is reported
  as a deployment limitation in the submission.
