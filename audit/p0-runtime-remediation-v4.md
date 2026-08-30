# P0 Runtime Backend Remediation — Stage 2

**Date:** 2026-08-30  
**Branch:** `remediation/epelara-esigap-audit-v3`  
**Scope:** High-confidence runtime/correctness diagnostics in tracked application files. User-owned unrelated changes were not staged.

## Changes

| File | Change | Risk addressed |
|---|---|---|
| `backend/controllers/lkJurnalController.js` | Fixed the undefined `applyJournalPosting` path by applying `post_now` saldo changes through `applyJournalPostingWithTransaction` before the original transaction commits. | Prevents runtime `ReferenceError` and status/saldo divergence for create-and-post. |
| `backend/controllers/sasaranController.js` | Added the missing `Rpjmd` model import used by the active-RPJMD lookup. | Prevents runtime `ReferenceError` on Sasaran creation without an explicit RPJMD ID. |
| `backend/controllers/lakipExportController.js` | Removed duplicate `setHeader` and unused response-capture variable. | Removes shadowed configuration and a lint/runtime quality defect while preserving effective behavior. |
| `backend/monev/routes/evaluasiRoutes.js` | Added canonical `verifyToken` and `allowRoles` imports. | Prevents route initialization/runtime failure and ensures evaluator routes use authentication/authorization middleware. |
| `backend/controllers/mr_planningReportController.js` | Removed an empty catch that previously swallowed risk-matrix recalculation failures. | Prevents false `repaired` success responses after a failed recalculation. |
| `backend/services/rpjmdImportIndikatorExcelFlow.js` | Replaced undefined `rowRef` with the local row index in the error message. | Prevents runtime `ReferenceError` on over-capacity sasaran mapping. |
| `backend/services/rpjmdRkpdSyncService.js` | Removed unreachable legacy `buildPlans` body after the active RKPD planner return. | Removes dead behavior and reduces maintenance ambiguity. |
| `backend/services/planningOfficialDocumentEngine.js` | Replaced two `async` Promise executors with explicit error-safe Promise control flow. | Prevents hidden async rejection behavior in PDF generation. |
| `backend/services/mr/mrPlanningReportExportWordService.js` | Removed shadowed duplicate cell `margins` property while preserving the effective later values. | Removes ambiguous document-export configuration. |

## Verification

`node --check` passed for all nine targeted files. Targeted ESLint after the changes reported **0 remaining** diagnostics for: `no-undef`, `no-dupe-keys`, `no-constant-condition`, `no-unreachable`, `no-empty`, and `no-async-promise-executor` across the selected application files. The targeted set still had broader lint debt: `eqeqeq` 111 errors, `no-unused-vars` 33 errors, `prefer-const` 19 warnings, `consistent-return` 9 warnings, and 4 `no-console` warnings. These are intentionally deferred to dedicated stages rather than hidden by disabling rules.

The fresh repository-wide baseline remains: backend lint 2,956 problems and frontend lint 1,414 problems. The stage does not claim repository-wide lint closure.

## Acceptance status

| Gate | Status |
|---|---|
| Targeted source parses | `Verified` |
| Targeted runtime-rule diagnostics cleared | `Verified` |
| Runtime route/controller integration tests | `Not Verifiable` without disposable DB/API fixtures |
| Production migration/database execution | `Not Run` |
| Full lint gate | `Open` |

## Remaining P0 runtime items

Diagnostics in generated/UAT scripts and pre-existing user-owned migration work remain outside this stage. Any such file must be reviewed for ownership before modification. Runtime fixes are `Fixed Pending Retest` until the real route and service tests execute with synthetic fixtures.
