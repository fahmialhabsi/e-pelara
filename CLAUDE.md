# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This is a monorepo (no shared build tool) with two independently run apps:

- `backend/` — Express 5 + Sequelize (MySQL) API, port 3000
- `frontend/` — React 18 + Vite SPA, port 3001 (dev), proxies `/api` to the backend

There is a root `package.json` but it only aggregates lint/format across `frontend`, `frontend/rkpd-admin`, and `backend`, plus a governance-lock guard (see below). There is no root build/dev/test script — always run commands from inside `backend/` or `frontend/`.

Domain: this app ("ePeLARA") manages Indonesian regional government planning/finance documents across many linked modules — RPJMD, Renstra, Renja, RKPD, RKA, DPA, Penatausahaan (BKU/ledger), LK (Laporan Keuangan), LAKIP, BMD, TLHP, and MR (Manajemen Risiko / risk management). Most business logic files are prefixed by module (`mr_*`, `rpjmd*`, `renstra_*`, `renja*`, `rkpd*`, `lakip*`, `dpa*`, `rka*`, `lk*`, `bku*`, `penatausahaan*`) — grep by prefix to scope a module across routes/controllers/services/pages.

It also integrates with a sister app **e-SIGAP** (SSO auth, shared BKU/ledger data) — see project memory for the integration bridge if touching auth or BKU/ledger code.

## Common commands

Run server & frontend (no root script exists for this):
```bash
cd backend && node server.js       # or: npm run dev (nodemon)
cd frontend && npm run dev -- --host
```

Lint / format (from repo root, covers both apps):
```bash
npm run lint
npm run format
```
Backend lint delegates to the frontend's ESLint install (`node ../frontend/node_modules/eslint/bin/eslint.js`) — there is no separate ESLint package in `backend/`.

Frontend tests (Vitest — very small suite, only a handful of files under `include` in `frontend/vite.config.js`):
```bash
cd frontend && npm run test        # vitest run
cd frontend && npm run test:watch
```

Backend has **no real test framework** (`npm test` is the npm-init stub). Instead there are dozens of ad-hoc Node scripts in `backend/scripts/`, run directly and aliased in `backend/package.json` as `test:*`/`verify:*`, e.g.:
```bash
cd backend
npm run test:renja-validation
npm run verify:planning-schema
npm run check:db-schema           # verify DB schema matches Sequelize models
```
When adding a self-check script for a module, follow this pattern (`node scripts/xValidationSelfTest.js`) rather than introducing Jest/Mocha.

Database (MySQL via Sequelize):
```bash
cd backend
npx sequelize-cli db:migrate
npm run db:migrate:status
npm run check:db-schema           # exits 1 if required tables/columns are missing — run after switching DB/host/port
```
DB credentials live in `backend/config/config.json` (per `NODE_ENV`: development/test/production) and are **not** env-driven — edit that file directly for local setup. See `docs/DATABASE.md` for the full troubleshooting checklist (this project has been bitten before by pointing at the wrong MySQL instance/port).

## Backend architecture

- **`server.js`** is a single ~630-line bootstrap file: dotenv → Redis connect (exits process in production on failure) → CORS allowlist → JSON/urlencoded parsing → cookie-parser → request-id/logging middleware (Winston) → `/health`, `/readiness`, `/metrics-lite` → rate limiting on select MR routes → morgan → **~145 individual `require('./routes/...')` + `app.use(path, router)` calls**, grouped by module comment blocks. There is no central route loader/registry — to add a module's routes, require and mount them here alongside the matching module block. Socket.io is attached to the HTTP server purely for role/user notification rooms (`app.get('io')`), not general realtime logic. `node-cron` is a dependency but currently unused/unwired.
- **Models** (`backend/models/`, ~200 files) auto-load via `models/index.js`, which scans the directory, supports both classic Sequelize factory exports and pre-`init`ed classes, and applies a `MODEL_ALIASES` map for a few renamed legacy models. Naming is inconsistent by era (`fooModel.js`, `PascalCase.js`, plain `camelCase.js`) — check `models/index.js` if a model can't be found by guessing the filename. Multi-tenancy is enforced globally via `installTenantIsolation(sequelize, db)` (`lib/tenantSequelizeHooks`) rather than per-model, and `mrAssociations.js` wires MR-specific associations separately in a try/catch after the main load.
- **Module layering** is routes → controllers → services → models, consistently. `verifyToken` (JWT/SSO) + `allowRoles([...])` are applied per-route in the route file, not globally. The MR module additionally nests its services under `services/mr/` (~49 files) instead of flat in `services/`.
- **Auth** (`middlewares/verifyToken.js`) supports both local JWT and SSO tokens (shared secret with e-SIGAP), resolves tenant context via AsyncLocalStorage (`tenantContext.run(...)`), and translates SIGAP roles to ePeLARA roles. `middlewares/authenticate.js` is a deprecated shim — use `verifyToken` directly, don't add new usages of `authenticate.js`.
- **AI/LLM narrative generation** (MR module only) lives in `services/mr/narrativeProviders/`, selected via `narrativeProviderFactory.js` based on `MR_NARRATIVE_PROVIDER` env (`mock` / `rule_enhanced` default / external), gated behind `MR_NARRATIVE_EXTERNAL_ENABLED` + `MR_NARRATIVE_ALLOW_EXTERNAL`, and falls back to `rule_enhanced` on any provider error. The `openai` provider is registered but has no adapter implemented yet.
- **Document export** (PDF/DOCX/XLSX): `services/exportService.js` provides a generic ExcelJS helper (`exportExcel(...)`) for simple tabular exports with consistent branded styling. Complex module-specific documents (MR reports, DPA, LK) use dedicated per-module export service families instead (e.g. `mrPlanningReportExportPdfService.js` / `...ExportWordService.js` / `...ExportExcelService.js`). `puppeteer` is used narrowly for HTML-to-PDF in a handful of controllers (renstra, dpa, rka, lakip, lk) — not the default PDF path.
- **Migrations** (`backend/migrations/`, ~190 files): heavy iterative evolution is normal here — expect same-day paired create/fix/dedupe migrations for a single table when a module was actively being debugged. Prefer adding a new migration over editing an old one.

## Frontend architecture

- **Bootstrap**: `main.jsx` → `QueryClientProvider` (TanStack Query) → `BrowserRouter` → `App.jsx`'s `AppRoot`, which nests `ConfigProvider`/`AntdApp` (Ant Design theme) → `DokumenProvider` → `RpjmdExcelPreviewProvider` → `AuthProvider` → auth/redirect gate → `PeriodeAktifProvider` → `NotificationProvider` → `FilterProvider` → `MonevProvider` → routes.
- **Routing is split**: most routes are written inline as JSX in `App.jsx` (older modules: rpjmd, rkpd, renja, rka, dpa, lk, penatausahaan), each wrapped in `DokumenTahunGuard`/`RequireDokumenType` + `ProtectedRoute(role)`. Newer/refactored modules export a route array from their own file (`src/routes/renstraRoutes.jsx`, `src/routes/mrRoutes.jsx`, `src/config/routes.jsx` for rpjmd) which gets spread into `<Routes>` in `App.jsx`. When adding routes to an already-refactored module, extend its route array file; for legacy modules, add inline in `App.jsx` to match the existing convention.
- **Pages live in two places**: simple/legacy pages sit in `src/pages/<module>/`; most substantial modules use `src/features/<module>/{pages,components,hooks,context}/` instead (audit, bmd, dpa, lakip, lk, lk-dispang, lpk-dispang, monev, mr, penatausahaan, pengkeg, planning-audit, renja, renstra, rka, rkpd, rpjmd, settings, users). The `mr` module has pages in both places — check both when working on it. `src/pages/mr/unified/` is a new 5-step Ant Design wizard (`MrRiskManagementWizardPage.jsx` + `steps/`) consolidating the older separate MR Context/Risk/Report flow; the legacy standalone routes are kept alongside it, not replaced.
- **Services** (`src/services/`, flat, one file per module/resource) all route through the shared axios instance in `src/services/api.js`: request interceptor attaches `Authorization: Bearer <token>` from localStorage plus `X-Tenant-Id` (for `SUPER_ADMIN` tenant switching); response interceptor does silent refresh-on-401 (queues concurrent requests) and global toast error handling. New service files should follow the existing convention seen in e.g. `mrPlanningRiskService.js`: plain object with CRUD methods, exported React Query key builders, and response-shape normalizer helpers (`getArrayData`/`getResponseData`).
- **UI library stack is genuinely mixed by module/vintage**, not a single dominant kit: MUI for shell chrome (`MuiSidebarGlobal.jsx` is the current main nav drawer), Ant Design for the MR module, react-bootstrap/Bootstrap and CoreUI elsewhere, plus Tailwind and Radix present. Match whatever the module you're editing already uses — don't introduce a new UI library into an existing page.
- **Contexts** (`src/contexts/`): `AuthProvider` (JWT decode, auto-refresh every 55 min, SSO token-in-URL handling, SIGAP→ePeLARA role mapping), `DokumenProvider` (selected dokumen type + tahun — drives most route guards), `PeriodeContext`, `FilterContext`, `NotificationProvider`, `RpjmdExcelPreviewContext`.
- Path alias `@/*` → `src/*` is configured in `jsconfig.json` and mirrored in `vite.config.js`'s `resolve.alias`.

## Governance lock guard (repo-specific gotcha)

`.governance/final-lock.json` + `scripts/check-final-locked-files.js` implement an opt-in "final lock" over all of `frontend/` and `backend/` (excluding `node_modules`, `dist`, `uploads`, `logs`, `tmp`), intended to block changes to stabilized ("HIJAU") code without an owner unlock key (`EPELARA_FINAL_LOCK_KEY` / `EPELARA_FINAL_LOCK_HASH` env vars). Run via `npm run guard:final-lock`. **It is not wired into any git hook or CI in this repo currently** — it's a manual check the user runs themselves. Don't assume it blocks your edits; it also doesn't need to be run automatically after every change unless the user asks.
