# AUD-003 Representative and Negative Disposable Tests — v5

**Date:** 2026-08-30  
**Target:** Disposable MySQL `epelara_audit_v5` in `epelara-audit-v5-mysql`.  
**Production access:** None.

## Guard and fixture

The harness revalidated the exact container/image, running state, loopback host `127.0.0.1`, port `13317`, database `epelara_audit_v5`, and disposable-only draft variables before connecting. It created only synthetic target tables and synthetic values, then removed those tables in `finally` cleanup.

## Representative-schema test

The harness created three synthetic tables matching the required `id` and `kode_indikator` columns for `indikatorstrategis`, `indikatorarahkebijakans`, and `indikatorsubkegiatans`, with one synthetic row per table. The draft `up` function completed and created one unique forward-fix index per table. A second `up` invocation completed without creating duplicate indexes. The `down` path removed only the forward-fix indexes.

Result: `PASS` for representative schema index creation, idempotent repeat, and reversible index-only down path.

## Duplicate-key negative test

The harness created the same representative schema and inserted two rows with the same synthetic `kode_indikator` into `indikatorstrategis`. The draft failed before index mutation with a duplicate-key diagnostic. The test confirmed that no index was added and both duplicate rows remained. No automatic deletion or deduplication occurred.

Result: `PASS` for fail-closed duplicate-key handling and data preservation.

## Command

```powershell
$env:EPELARA_TEST_HOST='127.0.0.1'
$env:EPELARA_TEST_PORT='13317'
$env:EPELARA_TEST_DATABASE='epelara_audit_v5'
$env:EPELARA_FORWARD_FIX_MODE='DISPOSABLE_ONLY'
$env:EPELARA_AUDIT_DATABASE='epelara_audit_v5'
$env:EPELARA_AUDIT_HOST='127.0.0.1'
$env:EPELARA_FORWARD_FIX_APPROVED='true'
npm --prefix backend run test:forward-fix-disposable
```

Observed results:

```text
empty_database=PASS
 duplicate_key=PASS
representative_database=PASS
idempotency=PASS
down_path=PASS
forward_fix_disposable_exit=0
production_access=NOT_USED
production_data=NOT_USED
```

## Acceptance status

The draft’s representative and duplicate-key behaviors are `Verified` in this disposable synthetic harness. `AUD-003` remains `Fixed Pending Retest`/`Open Release Blocker` because the active migration chain is still invalid, applied-history authority is not reconciled, and fresh/upgrade/injected-failure/restore tests for the full chain have not been run. No production migration was executed.
