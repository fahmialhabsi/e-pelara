# Compatibility Runner Disposable Simulation — v5

**Date:** 2026-08-30  
**Target:** `epelara-audit-v5-mysql` / `epelara_audit_v5` / `127.0.0.1:13317`.  
**Mode:** `UPGRADE_DISPOSABLE`.  
**Production access/data:** `NOT_USED`.  
**Active migration execution:** `NOT_RUN`.

## Purpose

Simulate the compatibility-runner preflight for an existing upgrade environment using sanitized `SequelizeMeta`. The simulation must reconcile exact migration names, invoke the controlled gate, preserve unresolved conflict behavior, and stop before active migration execution. It must not create an artificial applied marker, silently skip a migration, rename/reorder a historical file, or modify raw application data.

## Guard evidence

| Guard | Result |
|---|---|
| Exact container `epelara-audit-v5-mysql` | `PASS` |
| MySQL image `mysql:8.0.46` | `PASS` |
| Database `epelara_audit_v5` | `PASS` |
| Loopback `127.0.0.1:13317` | `PASS` |
| Compatibility mode | `PASS` — `UPGRADE_DISPOSABLE` |
| Production access flag | `PASS` — false |
| Credential handling | `PASS` — process-scoped and not recorded |

## Applied-history reconciliation simulation

The sanitized fixture contained only three migration names corresponding to the three RPJMD table-creator markers. It contained no credentials, application data, PII, token, connection string, or production identifier. The names were inserted and read back from the disposable `SequelizeMeta` table using exact string comparison.

| Check | Result |
|---|---|
| Fixture contains credentials | `false` |
| Fixture contains application data | `false` |
| Sanitized migration-name load | `PASS` |
| Exact readback/order comparison | `PASS` |
| Artificial `SequelizeMeta` marker | `NOT_USED` |

## Compatibility gate result

The controlled gate was invoked in upgrade mode with the sanitized history file. The result was an explicit block:

```text
compatibility_applied_history=PASS
compatibility_gate=PASS: unresolved duplicate-prefix/AUD-003 conflict explicitly blocked
silent_skip=NOT_OCCURRED
active_migration_execution=NOT_RUN
raw_data_deletion=NOT_RUN
production_access=NOT_USED
production_data=NOT_USED
simulation_exit=0
```

The harness returned exit code `0` because the expected compatibility-runner behavior for this unresolved chain is a controlled `BLOCK`, not a successful migration. The underlying gate returned exit code `2` and reported `DUPLICATE_ACTIVE_PREFIX` and `AUD-003_PREMATURE_DEDUPE`; the harness treated that explicit block as a passing security assertion.

## Interpretation

The simulation confirms that compatibility preflight can consume sanitized applied history without treating it as permission to bypass unresolved migration conflicts. It does not prove that any real upgrade environment has applied the three markers, and it does not validate the full legacy chain. Real environment applied history remains `Not Verifiable` until supplied by the environment owner/DBA.

## Status

The compatibility-runner simulation is `Verified` as a disposable fail-closed behavior test. Controlled gate remains `Implemented / Nonactive`. AUD-003 remains `Fixed Pending Retest / Open Release Blocker`, and the system remains `NOT READY`.
