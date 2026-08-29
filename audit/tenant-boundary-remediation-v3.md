# Tenant/OPD Boundary Remediation — Stage 3

**Date:** 2026-08-29  
**Branch:** `remediation/epelara-esigap-audit-v3`  
**Scope:** Safe repository changes and synthetic regression testing only. No production database or deployment was accessed.

## Changes made

A reusable `backend/helpers/opdBoundary.js` helper now derives the caller OPD from authenticated `req.user.opd` and the authoritative `OpdPenanggungJawab` registry. It rejects missing caller context, missing ownership, lookup failures, and mismatched OPD IDs instead of treating the request as global. `SUPER_ADMIN` remains an explicit tenant-wide exception already present in the project’s authorization model.

`backend/controllers/penatausahaanController.js` now applies the helper to list, detail, create, update, and delete flows. List/detail queries scope the DPA parent through server-derived `opd_id`; create verifies the DPA parent before mutation; update and delete load the DPA parent and verify it before mutation. Client-provided `opd_id` is not accepted by the update schema or used to establish scope.

The MR LHP, Temuan, and Tindak Lanjut read-side paths now receive authenticated caller context. LHP list/detail, Temuan list/detail, and Tindak Lanjut list/detail resolve ownership through the authoritative parent chain before returning records. Non-super-admin LHP list requests ignore a client-supplied `opd_id` and use the caller-derived scope.

## Evidence and test results

| Evidence | Result | Interpretation |
|---|---|---|
| `backend/scripts/opdBoundarySelfTest.js` | Pass | The production helper allowed same-OPD access, denied cross-OPD access, denied missing context, failed closed for missing owner, and preserved explicit SUPER_ADMIN scope. |
| `node --check backend/helpers/opdBoundary.js` | Pass | Helper syntax is valid. |
| `node --check backend/controllers/penatausahaanController.js` | Pass | Penatausahaan controller syntax is valid. |
| `node --check backend/services/mr/mrPlanningLhpService.js` | Pending final run in attached environment | Must be rerun with the exact repository command and recorded in the final retest report. |
| API/DB cross-tenant integration test | Not Verifiable | No disposable/staging database and authenticated test fixture were available; production access was not attempted. |

The synthetic test command used was `node backend/scripts/opdBoundarySelfTest.js` in the attached repository. Fixtures were in-memory labels and numeric OPD IDs and contained no production data.

## Finding status

| Finding | Current status | Reason |
|---|---|---|
| AUD-002 / AUD-2026-003 | `Fixed Pending Retest` | Penatausahaan guards are implemented and helper regression passes, but endpoint-level negative tests against production controller code and a disposable database were not run. |
| AUD-006 / AUD-2026-007 | `Open` | Renstra child controllers remain incompletely inventoried/remediated; no closure claim is made. |
| AUD-024 / AUD-2026-008 | `Fixed Pending Retest` for LHP/Temuan/Tindak Lanjut list/detail only | Read-side caller propagation and parent checks were added, but history, export, delete, and full cross-OPD integration coverage remain unverified. |
| AUD-2026-002 | `Open` | The global model whitelist still does not prove complete system-wide tenant isolation; broad model/query inventory and database constraints remain required. |

## Limitations and blockers

The change does not assert that all application models are tenanted. The repository contains both isolated per-region assumptions and legacy/global reference models, so adding a tenant filter globally without a domain ownership matrix would be unsafe. Renstra Tujuan, Sasaran, Strategi, Kebijakan, Program, Kegiatan, and Subkegiatan sibling routes require a dedicated parent-ownership inventory before they can be closed. MR history and delete routes also require authorization review. Socket rooms, file storage, caches, exports, background jobs, and raw SQL remain outside this stage’s verified closure.

No finding is `Closed Verified` from this artifact. Closure requires endpoint-level positive/negative tests using the real controllers/services, safe error assertions, route coverage, independent review, and disposable database evidence.

## Rollback

Rollback is limited to reverting the stage-specific commit after preserving this evidence. No migration or data change was executed, and no production rollback is required.
