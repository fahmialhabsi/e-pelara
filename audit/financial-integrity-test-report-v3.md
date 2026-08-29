# Financial Integrity Remediation and Test Report — Stage 5

**Date:** 2026-08-29  
**Branch:** `remediation/epelara-esigap-audit-v3`  
**Scope:** Manual journal posting/void transaction boundary and saldo row locking. No production database or live financial data was accessed.

## Implementation changes

`backend/controllers/lkJurnalController.js` now performs journal POST and VOID transitions inside the same Sequelize transaction as the corresponding saldo application. Each operation locks the target journal row with `t.LOCK.UPDATE`, validates the authoritative status while holding the lock, changes the status within the transaction, applies the saldo delta through `applyJournalPostingWithTransaction`, and commits only if all steps succeed. A failed saldo application therefore rolls back the status mutation rather than leaving a `POSTED` or `VOID` status without the matching ledger effect.

`backend/services/lkSaldoService.js` now requests `t.LOCK.UPDATE` when reading an existing `saldo_akun` row before applying the debit/credit delta. This is a necessary concurrency control but does not by itself prove exactly-once behavior for first-row creation under concurrent different journals; a unique database constraint and disposable-database race test remain required.

## Evidence

| Evidence | Result | Status implication |
|---|---|---|
| `node --check backend/controllers/lkJurnalController.js` | Pass | Syntax valid. |
| `node --check backend/services/lkSaldoService.js` | Pass | Syntax valid. |
| Static review of `post` and `void` | Transaction + row lock present | Code path is `Fixed Pending Retest`, not closed. |
| Two concurrent POST requests against disposable DB | Not Verifiable | No isolated database/fixture was available; production was not touched. |
| POST/VOID failure injection and rollback | Not Verifiable | Requires disposable DB transaction behavior and injected saldo failure. |
| Reconciliation saldo versus journal | Not Verifiable | Requires representative synthetic financial fixtures and owner review. |

## Required concurrency test

The release-blocking test must create one synthetic `DRAFT` journal with balanced details, send two concurrent POST requests through the real controller/route, assert exactly one success and one conflict, and compare the resulting saldo delta to one journal application. It must then execute concurrent or repeated VOID attempts, inject a failure in the saldo operation, assert rollback to the original status, and run a journal-to-saldo reconciliation query. The command, timestamp, database engine/version, fixture classification, and artifacts must be recorded by the test operator.

## Finding status

| Finding | Status | Rationale |
|---|---|---|
| AUD-001 / AUD-2026-001 | `Fixed Pending Retest` | The primary race path is now transaction-scoped and row-locked, but real concurrent database evidence and first-row uniqueness behavior remain unverified. |
| AUD-019 / AUD-2026-008 | `Open` | Financial audit-trail coverage across LK/BKU/Penatausahaan was not implemented in this stage. |
| AUD-036 | `Open` | BKU reject/delete history behavior remains outside this change. |

## Rollback and safety

This stage made no schema migration and executed no database write. Rollback is by reverting the stage-specific code commit after preserving this evidence. Any future saldo uniqueness migration must be preceded by duplicate detection, backup manifest, disposable rehearsal, and owner approval.
