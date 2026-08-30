# Migration Invariant Report — Option C v5

**Date:** 2026-08-30  
**Scope:** AUD-003 forward-fix and controlled-chain preparation.  
**Production access:** None.

## Invariant contract

The following invariants must hold before a forward-fix is considered successful on a target disposable/upgrade environment:

| Invariant | Required condition |
|---|---|
| Target identity | Host is loopback, database is `epelara_audit_v5`, and the container is explicitly disposable. |
| Target tables | `indikatorstrategis`, `indikatorarahkebijakans`, and `indikatorsubkegiatans` exist before index repair. |
| Required columns | Each target table has `id` and `kode_indikator`. |
| Duplicate policy | No duplicate non-null `kode_indikator` exists before unique index creation; duplicate rows are preserved when the guard fails. |
| Forward-fix indexes | Each target table has exactly one named `uniq_rpjmd_kode_indikator_forward_fix_<table>` index after a successful run. |
| Idempotency | A repeated `up` does not create duplicate indexes or alter rows. |
| Reversible index path | `down` removes only indexes created by the forward-fix. |
| Applied history | Upgrade mode has an owner-provided sanitized `SequelizeMeta`/equivalent history; absence is `Not Verifiable` and blocks. |
| Chain policy | Duplicate active prefixes and AUD-003 premature operation are explicitly decided; no silent skip or lexical-order assumption. |
| Data preservation | No forward-fix path deletes or chooses an authoritative duplicate row without written owner/DBA policy. |

## Current disposable evidence

The disposable harness used `epelara-audit-v5-mysql` / `epelara_audit_v5` with loopback-only port `13317`. It passed target guard, empty-schema fail-closed, representative synthetic schema, duplicate-key fail-closed, idempotent `up`, and index-only `down`. The harness cleaned its synthetic objects afterward.

The current empty disposable database has no `SequelizeMeta` table because no active migration chain was executed. This is not evidence about any other environment. The invariant check command is available as:

```powershell
$env:EPELARA_INVARIANT_MODE='DISPOSABLE_ONLY'
$env:EPELARA_INVARIANT_HOST='127.0.0.1'
$env:EPELARA_INVARIANT_DATABASE='epelara_audit_v5'
$env:EPELARA_PRODUCTION_ACCESS='false'
npm --prefix backend run db:migrate:invariant
```

The password must be injected only through process environment and must never be committed or printed.

## Pending invariant tests

| Scenario | Status | Required evidence |
|---|---|---|
| Empty target before active chain | `Verified` for draft fail-closed | `forward-fix-empty-database-test-v5.md` |
| Representative schema | `Verified` for synthetic schema | `forward-fix-representative-database-test-v5.md` |
| Duplicate keys | `Verified` for preservation/fail-closed | `forward-fix-disposable-test-report-v5.md` |
| Existing forward-fix indexes | `Verified` through repeat `up` | Disposable harness output. |
| Missing required column | `Not Run` | Disposable negative test required. |
| Injected failure between target tables | `Not Run` | Failure injection and state comparison required. |
| Fresh active-chain installation | `Blocked` | Controlled gate blocks duplicate/AUD-003; active chain not run. |
| Representative upgrade | `Not Verifiable` | Applied history and representative schema not owner-provided. |
| Restore after failure | `Not Run` | Disposable backup/restore procedure required. |
| Production state | `Not Used` | Prohibited by scope. |

## Status

The forward-fix draft satisfies the tested invariants for its narrow disposable synthetic scope. The system-level AUD-003 invariants remain `Fixed Pending Retest / Open Release Blocker` until applied-history reconciliation, fresh/upgrade policy, missing-column/failure/restore tests, and owner/DBA review are complete. No active migration execution is authorized by this report.
