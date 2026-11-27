# AI_USAGE.md — Warehouse Management System (UI)

Day 1 (Fri 27 Nov 2026). Updated as the build progresses.

## Tools used

- **Muse (Meta) coding agent** — built the Day 1 UI scaffold and pages in
  this repository from the brief (`Design_Round.md`) and the build plan
  (`IITB-design-round-plan.md`), working to the API contract agreed with
  the parallel Django API build.
- No other AI tools were used on Day 1.

## Tasks supported

- Project scaffolding (`package.json`, `vite.config.ts`, `tsconfig.json`,
  `playwright.config.ts`, `.env.example`, `.gitignore`).
- API client (`src/api.ts`), auth context, routing with role gating, and
  the five pages (Login, Map, Shuttle, Dashboard, Admin Users) plus the
  Load dialog and responsive CSS.
- README / DESIGN.md drafts for this repository.

## How outputs were checked

- `npx tsc --noEmit` (type-check) and `npm run build` run for real; results
  recorded in the build report (see the parent agent's verification log).
- `npm start` + `curl` checks of the served app and the SPA fallback route.
- Live login against the real API was **not** possible on Day 1: the API
  repo did not exist yet in this workspace and no API was running on port
  8000, so no login was attempted and none is claimed. That check waits for
  the coordinator's end-to-end pass once the API is running.
- No Playwright tests exist yet, so no test run is claimed.

## Corrections / verification steps

- The API base-URL order follows the brief's evaluation conventions
  (`VITE_API_BASE_URL` → `REACT_APP_API_BASE_URL` → `API_BASE_URL` →
  default), implemented via Vite `envPrefix` so the non-`VITE_` names are
  actually exposed to the browser bundle.
- The map polls every 3 s (inside the brief's 5 s requirement) and every
  cell carries a text label, so colour is never the only state indicator.

## Remaining uncertainty

- The API contract above is the agreed contract with the parallel build;
  if the Django implementation returns different shapes, the UI client
  must be adjusted and re-verified end to end.
- The candidate (Devesh) has no prior hands-on TypeScript or Playwright
  experience. A file-by-file walkthrough of this code is planned before
  the follow-up interview so he can explain, navigate, and modify it
  without AI assistance.
