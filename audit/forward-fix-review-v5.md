# AUD-003 Forward-Fix Draft Review — v5

**Date:** 2026-08-30  
**Draft:** `backend/migrations/drafts/20260830120000-rpjmd-indicator-unique-forward-fix.draft.js`  
**Review mode:** Read-only source review plus disposable synthetic test evidence.  
**Production access:** None.

## Review result

The draft is a safe, inactive candidate for the uniqueness portion of AUD-003. It is not a repair of the active migration chain. It must remain under `backend/migrations/drafts/` until applied-history inventory, owner/DBA review, dependency graph approval, and full disposable fresh/upgrade/failure/recovery testing are complete.

## Control review

| Control | Result | Evidence |
|---|---|---|
| Does not rename/reorder old migrations | `Verified` | Draft is a new file under `backend/migrations/drafts/`; no existing migration file changed. |
| Prevents generic execution | `Verified` | `assertDisposableOnly()` requires explicit mode, database, host, and approval variables. |
| Restricts target database | `Verified in test contract` | Requires `epelara_audit_v5` and `127.0.0.1`; shell guard independently verified the container. |
| Validates target tables | `Verified` | `showAllTables()` and explicit table allowlist. |
| Validates required columns | `Verified` | `describeTable()` checks `id` and `kode_indikator`. |
| Rejects duplicate keys | `Verified in disposable test` | Grouped duplicate query fails before index mutation. |
| Avoids automatic data deletion | `Verified` | No `DELETE`, `destroy`, `dropTable`, or dedupe operation in draft. |
| Adds index idempotently | `Verified in disposable test` | Existing index is checked by name before `addIndex`. |
| Reversible index path | `Verified in disposable test` | `down` removes only its own named indexes. |
| Multi-table atomicity | `Open` | Failure injection and DDL transaction/compensation behavior are not yet verified. |
| Applied-history awareness | `Open` | A migration module cannot infer `SequelizeMeta` history from source. |
| Fresh-chain correctness | `Open` | Existing premature migration may fail before this draft can be reached. |

## Disposable evidence used

The test target was `epelara-audit-v5-mysql` / `epelara_audit_v5` with loopback-only port `13317`. The guard passed. The following scenarios passed with synthetic tables and rows: empty schema fail-closed; duplicate `kode_indikator` fail-closed with both duplicate rows preserved; representative schema index creation; repeated `up` idempotency; and index-only `down`.

The evidence is limited to the draft behavior and does not prove the historical chain, applied state in any environment, upgrade behavior, or recovery behavior. The consolidated record is `audit/forward-fix-disposable-test-report-v5.md`.

## Activation blockers

Activation requires an owner/DBA applied-history inventory for each nonproduction environment, authoritative mapping of the four duplicate prefix groups, a decision for the old `20260218120000` premature operation, a duplicate/FK data policy, and a fresh/upgrade/failure/restore test matrix. The draft must not be promoted into the active migration directory until these gates pass and an independent reviewer signs the result.

## Finding status

`AUD-003` remains `Fixed Pending Retest / Open Release Blocker`. The draft and its disposable behavior are validated narrowly, but the active migration chain remains unresolved and no production migration was run.
