# AUD-003 Disposable Forward-Fix Test Report — v5

**Date:** 2026-08-30  
**Branch:** `remediation/epelara-esigap-audit-v3`  
**Target:** disposable MySQL container `epelara-audit-v5-mysql`, database `epelara_audit_v5`.  
**Production access:** None.

## Scope and guard

The test used only a loopback disposable target: MySQL `8.0.46`, host `127.0.0.1`, port `13317`, database `epelara_audit_v5`, network `epelara-audit-v5-net`, and volume `epelara-audit-v5-mysql-data`. The harness verified the exact container name, image, running state, network, volume, loopback port, audit database, and disposable-only environment variables before connecting. Temporary credentials were injected through process scope and were not printed or committed.

Existing active migrations were not renamed, reordered, imported, or executed. The draft remained under `backend/migrations/drafts/` and was invoked directly by the controlled disposable harness only.

## Test results

| Scenario | Result | Evidence |
|---|---|---|
| Empty database | `PASS` | Target tables absent; draft failed closed before schema mutation; zero target tables remained. |
| Representative schema | `PASS` | Three synthetic target tables with required `id` and `kode_indikator` columns were created. |
| Duplicate business key | `PASS` | Two identical synthetic `kode_indikator` values caused fail-closed error; no index was added and both rows remained. |
| Forward-fix `up` | `PASS` | One unique index was created for each target table after schema and duplicate checks. |
| Repeat `up` | `PASS` | No duplicate indexes were created; rerun was idempotent. |
| Forward-fix `down` | `PASS` | Only the three indexes owned by the draft were removed. |
| Production access/data | `PASS` | Not used. |
| Migration `up`/`down` through active chain | `NOT RUN` | Deliberately excluded; active chain validator still fails. |

## Command and observed output

```powershell
npm --prefix backend run test:forward-fix-disposable
```

```text
empty_database=PASS: draft failed closed before any schema mutation
duplicate_key=PASS: draft stopped before index mutation and preserved both synthetic rows
representative_database=PASS: three unique indexes created after schema/key checks
idempotency=PASS: repeated up created no duplicate indexes
down_path=PASS: draft removed only its own indexes
forward_fix_disposable_exit=0
production_access=NOT_USED
production_data=NOT_USED
```

## Changes covered

The draft migration `backend/migrations/drafts/20260830120000-rpjmd-indicator-unique-forward-fix.draft.js` remains inactive and guarded. The disposable harness is `backend/scripts/forwardFixDisposableIntegrationTest.js`, exposed through `backend/package.json` as `test:forward-fix-disposable`. The test only creates and removes synthetic tables in the disposable database.

## Acceptance and residual risk

The draft behavior is `Verified` for the tested empty, representative, duplicate-key, idempotency, and index-only down scenarios. `AUD-003` remains `Fixed Pending Retest` at the remediation level and remains a release blocker because the active migration chain still has four duplicate prefixes, the repository inventory cannot prove applied history, and full fresh-chain, representative-upgrade, injected-failure, and backup-restore tests have not been completed.

The draft does not solve the historical ordering conflict by itself. It is a safe forward-fix candidate that must be appended only after an authoritative applied-history decision. Any data deduplication or FK reconciliation requires a separate owner/DBA-approved policy and test; this draft intentionally refuses to guess which duplicate is authoritative.

## Cleanup and safety

The harness removes only its synthetic target tables in a `finally` block. No production schema, storage, migration history, backup, restore, seed, API, or external provider was accessed. If a later test fails before cleanup, the named disposable container may be recreated; production must never be used as a cleanup substitute.
