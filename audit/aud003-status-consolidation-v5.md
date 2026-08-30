# AUD-003 Status Consolidation — v5

**Finding:** AUD-003 — premature RPJMD indicator dedupe/unique-index migration dependency.  
**Current status:** `Fixed Pending Retest / Open Release Blocker`.  
**System status:** `NOT READY`.  
**Scope:** e-PeLARA/e-SIGAP migration chain; no production access or execution.

## Root cause

`20260218120000-rpjmd-indikator-kode-dedupe-unique.js` performs deduplication and unique-index operations against three RPJMD indicator tables that are created by later migration candidates `20260415110001-create-indikatorstrategis.js`, `20260415110002-create-indikatorarahkebijakans.js`, and `20260415110003-create-indikatorsubkegiatans.js`. The operation is also destructive because it may delete or consolidate data according to its implementation rather than a written owner-approved authoritative-row policy.

The active candidate chain separately contains four duplicate prefixes: `20260412120000`, `20260424120000`, `20260428120000`, and `20260720120000`. The applied status of all 264 active candidates is `Not Verifiable`; repository names do not prove applied state.

## Implemented controls

| Control | Status | Evidence |
|---|---|---|
| Immutable historical migration files | Verified | No active migration renamed, reordered, or edited. |
| Controlled chain gate | Implemented and disposable-tested | `backend/scripts/controlledMigrationChainGate.js`; explicit block for duplicate prefix/AUD-003; no silent skip. |
| Guarded forward-fix draft | Implemented and disposable-tested | `backend/migrations/drafts/20260830120000-rpjmd-indicator-unique-forward-fix.draft.js`. |
| Duplicate-key refusal | Verified on synthetic schema | Draft stops before index mutation and preserves duplicate rows. |
| Idempotent index creation | Verified on synthetic schema | Repeated `up` does not create duplicate index. |
| Failure/rollback/recovery harness | Verified on disposable metadata fixture | Duplicate metadata failure rolls back; sanitized dump restores markers. |
| Authoritative-row/FK policy | Drafted, pending approval | `audit/authoritative-row-fk-reconciliation-policy-v5.md`. |

## Evidence limitations

The disposable tests cover the draft contract and gate behavior, not the historical active migration chain. No real environment supplied sanitized `SequelizeMeta`/equivalent applied history. No active migration chain was executed. No owner/DBA approval has been recorded for duplicate-row authority, FK remapping, fresh-install strategy, compatibility runner behavior, or forward-fix promotion.

## Closure condition

`Closed Verified` is prohibited until implementation, integration/security tests, evidence paths, named owner, independent reviewer, rollback/recovery evidence, and retest are all present. The existing disposable evidence is therefore recorded as bounded verification and does not close the finding.

## Required next action

Use the Option C decision package to obtain owner/DBA decisions, then run the retest sequence only on disposable or explicitly approved nonproduction infrastructure. Do not activate the forward-fix or active chain before the gate returns `PASS` under the approved policy.
