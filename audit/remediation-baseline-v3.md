# Remediation Baseline v3

**Project:** e-PeLARA/e-SIGAP  
**Baseline captured:** 2026-08-29 21:52:55 +09:00  
**Working branch:** `remediation/epelara-esigap-audit-v3`  
**Baseline HEAD:** `902c14c051fed6e5da2b9ecc72add93cf2d6cdb9`  
**Repository remote:** `https://github.com/fahmialhabsi/e-pelara.git`  
**Mode:** Non-destructive remediation preparation. No production database, deployment, DNS, firewall, credential, or source reset operation was performed.

## Purpose and baseline integrity

This file records the repository state before remediation changes. The repository already contained user work in progress when the task began. Those changes are preserved and are not included in the remediation commits unless a later task explicitly identifies a file as part of a verified remediation change. No `git reset --hard`, `git clean`, force push, migration execution, or production data mutation was performed.

A new branch was created from the existing checkout using `git switch -c remediation/epelara-esigap-audit-v3`. The pre-existing working tree remains dirty. Remediation commits must stage only their own files, never use `git add .` or `git add -A`, and must not overwrite unrelated user changes.

## Existing working-tree changes preserved

At baseline, Git reported pre-existing modifications and untracked files, including work in `backend/`, `frontend/`, `docs/`, temporary Renja diagnostic/export files, ProSNP/FoodOps/Account Registry work, and self-test/migration files. The complete authoritative list is the output of `git status --porcelain=v1` at baseline; it included modified files such as `backend/.env.example`, multiple Renja/MR/tenant controllers and models, `backend/utils/pdfSigner.js`, `frontend/src/App.jsx`, and FoodOps pages, plus untracked ProSNP, Account Registry, Renja diagnostic, migration, backup-runbook, and self-test artifacts. These files are explicitly outside the stage-1 remediation commit unless independently verified and intentionally selected.

## Repository inventory observed

| Area | Observed inventory | Classification or limitation |
|---|---:|---|
| Backend controllers | 190 files | Active application source; requires cross-module review |
| Backend services | 251 files | Active application source; requires cross-module review |
| Backend models | 238 files | Active Sequelize data model surface |
| Backend routes | 162 files | Active API route surface |
| Backend middlewares | 19 files | Active authorization/validation boundary |
| Backend migrations | 531 files | Migration chain requires full ordered review; prior report cited 271, which is a baseline conflict to reconcile |
| Backend scripts | 189 files | Mixed operational/self-test/import/diagnostic content; classification required |
| Frontend source | 826 files | Active React/Vite source |
| `docs/` | 40 files | Project documentation; evidence status must be verified |
| `dokumenEPelara/` | 214 files | Mandatory recursive document inventory |
| `e-pelara-integration/` | 17 files | Integration/deployment component requiring source-vs-blueprint classification |
| Backend package lock | 370,815 bytes | npm lockfile present |
| Frontend package lock | 429,296 bytes | npm lockfile present |
| CI workflows | 3 files | `.github/workflows/ci-generic.yml`, `planning-audit-verify.yml`, and `workflow-compliance-verify.yml` |
| Generated/vendor/cache candidates | `node_modules`, build/coverage/dist, uploads, tmp/scratch areas | Must not be treated as source evidence without classification |

The active runtime/package surfaces identified are Node.js/Express 5/Sequelize/MySQL on the backend and React 18/Vite/Vitest on the frontend. Backend scripts include lint, database migration status, backup/restore verification, and multiple domain self-tests. The backend package currently has a placeholder `test` script that exits with an error, while the frontend package defines a Vitest test command; this is an implementation/test-quality observation to be verified in the dedicated workstream.

## Security handling

Environment files were identified, but their contents were not copied into this record. No password, token, API key, private key, cookie, connection string, production log, production backup, or personal data is included. Any future evidence must use redaction and synthetic/reduced fixtures.

## Baseline audit inputs

The existing audit baseline reports 85 structured findings in `audit/findings.json`, with 13 Critical, 23 High, 19 Medium, 15 Low, 14 Informational, and 1 Unknown finding. The existing report also describes a prior audit scope of 238 models and 162 API routes, records static analysis and safe command execution, and states `NOT READY`. The current repository inventory reports 531 migration files; the difference from the earlier report's 271 must be reconciled before any migration conclusion is changed. The prior report and findings remain unchanged.

The prior audit identifies release blockers including cross-tenant/OPD authorization gaps, administrator-to-super-admin takeover risk, financial posting race conditions, migration ordering and authoritative-status risks, dependency vulnerabilities, missing or non-automated security tests, raw error disclosure, missing audit trails, file/realtime/rendering controls, and operational evidence gaps. These claims are baseline hypotheses until re-verified against the current branch and current working-tree state.

## Not verified at baseline

Production topology, active tenancy model, deployment environment variables, actual reverse-proxy behavior, GitHub branch protection, production scheduler, storage controls, database backup/restore drill, RPO/RTO/SLA, load capacity, incident response, on-call ownership, and operational monitoring are not verifiable from the repository alone. They must remain `Not Verifiable` unless owner-provided evidence is supplied.

## Stage-1 acceptance status

The stage-1 baseline is complete for repository preparation: branch created without destructive operations, existing changes preserved, audit baseline identified, source and generated candidates noted, and required remediation outputs planned. No finding is closed by this record. All finding status changes require implementation evidence, tests calling production code, artifact paths, reviewer information, and residual-risk documentation.

## Commands recorded

The following safe repository commands were used during preflight: `git branch --show-current`, `git rev-parse HEAD`, `git status --porcelain=v1`, `git remote -v`, targeted directory/file counts, and PowerShell JSON metadata inspection of `audit/findings.json`. No database command, migration, server startup, production request, or data-changing SQL was executed.

## References

1. [`audit/system-audit-report.md`](system-audit-report.md)
2. [`audit/findings.json`](findings.json)
3. [`backend/package.json`](../backend/package.json)
4. [`frontend/package.json`](../frontend/package.json)
5. [Remediation prompt supplied for this task](../..)
