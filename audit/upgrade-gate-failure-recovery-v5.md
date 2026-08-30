# Upgrade-Gate Failure Handling and Recovery Simulation — v5

**Date:** 2026-08-30  
**Target:** `epelara-audit-v5-mysql` / `epelara_audit_v5` / `127.0.0.1:13317`.  
**Production access/data:** Not used.  
**Active migration chain:** Not run.

## Scope

This simulation exercises controlled-gate failure handling and recovery using only a disposable database. It creates a synthetic `SequelizeMeta` table containing three sanitized migration names, captures a logical disposable dump, injects a duplicate metadata write inside a transaction, verifies rollback, invokes the controlled gate with the sanitized applied-history file, and restores the pre-failure metadata from the disposable dump.

The simulation does not execute any active migration, does not modify historical migration files, and does not delete application data. The only table created and removed is the synthetic disposable `SequelizeMeta` table.

## Results

| Scenario | Result | Evidence |
|---|---|---|
| Exact container/image/state guard | `PASS` | Named audit container and `mysql:8.0.46`. |
| Loopback/database guard | `PASS` | `127.0.0.1:13317`, database `epelara_audit_v5`. |
| Pre-failure snapshot | `PASS` | Disposable `mysqldump` contains synthetic `SequelizeMeta`. |
| Injected duplicate-metadata failure | `PASS` | Duplicate primary-key insert failed inside a transaction. |
| Transaction rollback | `PASS` | Applied-history rows after failure matched pre-failure rows. |
| Conflict gate | `PASS` | Gate returned `BLOCK` exit `2` for duplicate active prefixes and AUD-003 while accepting provided history. |
| Missing-history decision | `PASS` | No `APPLIED_HISTORY_NOT_VERIFIABLE` was emitted because sanitized history was supplied. |
| Restore recovery | `PASS` | Disposable dump restored all sanitized applied-history markers. |
| Active migration execution | `NOT_RUN` | No `up`/`down` active migration was invoked. |
| Production access/data | `NOT_USED` | Prohibited by scope and guard. |

The test process exited with code `0`. The internal gate exit code `2` is expected: the gate must block unresolved migration conflict rather than continue.

## Interpretation

The simulation demonstrates that a duplicate metadata conflict can fail and roll back without losing the pre-failure applied-history rows, and that the gate continues to block unresolved duplicate-prefix/AUD-003 conditions even when sanitized applied history is present. It does not establish applied history for any real environment, and it does not prove cross-engine transactional DDL behavior for the full active migration chain.

## Required production-readiness evidence not established

The following remain `Not Verifiable` or `Not Run`: real environment `SequelizeMeta` reconciliation, fresh/upgrade execution of the active chain, full-chain failure injection, schema/data restore for all application tables, production backup policy, independent DBA review, and final owner activation approval.

## Status

`Verified` for the disposable failure/rollback/gate/recovery harness. `Fixed Pending Retest / Open Release Blocker` for AUD-003. No activation is authorized by this report.
