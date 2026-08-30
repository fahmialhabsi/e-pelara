# Option C Disposable Test Matrix — v5

**Date:** 2026-08-30  
**Target:** `epelara-audit-v5-mysql` / `epelara_audit_v5` / `127.0.0.1:13317`.  
**Production access:** None.  
**Active migration chain:** Not run.

## Guard

The shell preflight verified the exact container name, image `mysql:8.0.46`, running state, loopback-only port, audit database name, and temporary credential presence before launching the Node harness. The harness additionally required `DISPOSABLE_ONLY`, exact audit database/host, explicit approval, and exact Docker container name. No production endpoint, provider, credential, or data was used.

## Matrix result

| Scenario | Result | What was verified |
|---|---|---|
| Empty install | `PASS` | Draft failed closed when all target tables were absent and created no schema object. |
| Upgrade-like representative | `PASS` | Synthetic `SequelizeMeta` with three applied creator markers and three target tables was accepted by the draft test setup. This is not evidence for any real environment’s applied history. |
| Representative schema | `PASS` | Synthetic target tables contained required `id` and `kode_indikator` columns; three named unique indexes were created. |
| Existing index / repeat `up` | `PASS` | Repeated forward-fix did not create duplicate indexes. |
| Missing column | `PASS` | Missing `kode_indikator` caused fail-closed behavior before index mutation. |
| Duplicate key | `PASS` | Duplicate synthetic `kode_indikator` caused fail-closed behavior; both rows were preserved and no index was added. |
| Injected failure | `PASS` | Synthetic failure before the second index stopped the operation and exposed partial state for recovery; it did not continue silently. |
| Down path | `PASS` | Only draft-owned named indexes were removed. |
| Disposable backup/restore | `PASS` | Synthetic schema, rows, and forward-fix indexes were dumped, cleaned, restored, and rechecked. |

## Command

```powershell
npm --prefix backend run test:forward-fix-disposable
```

The process exited with code `0`. The harness creates and removes only synthetic tables in the named disposable database. Its dump/restore step uses `mysqldump` and `mysql` inside the named audit container; it does not invoke any active migration or production backup.

## Interpretation of injected failure

The injected failure intentionally occurs after the first index is created and before the second. The result is a visible partial state, not a claim of cross-table transactional atomicity. Recovery still requires the disposable snapshot/recreate procedure in `optionc-forward-fix-rollback-plan-v5.md`. The forward-fix must not be considered atomic across all tables until engine-specific DDL behavior is verified.

## Acceptance status

The draft is `Verified` for the tested disposable scenarios. The system finding `AUD-003` remains `Fixed Pending Retest / Open Release Blocker` because the active historical chain was not run, four duplicate active prefixes remain, applied history for real upgrade environments is `Not Verifiable`, and owner/DBA approval for activation is pending. No duplicate record was deleted and no authoritative row was selected.
