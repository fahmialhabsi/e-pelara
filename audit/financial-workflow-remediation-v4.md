# Financial Workflow and Transaction Integrity Remediation — Stage 5

**Date:** 2026-08-30  
**Scope:** DPA pergeseran and DPA perubahan persistence paths. No production migration or production database write was executed.

## Implemented controls

`backend/controllers/dpaPergeseranController.js` now uses the existing Sequelize connection for atomic DPA pergeseran creation. The generated pergeseran header and all item rows are committed together; rollback is attempted on any persistence failure. Validation exits occur before opening the transaction, and the maximum-pergeseran rejection is converted into a rollback-safe error.

The DPA perubahan save flow now commits header update/create, deletion of prior items, and replacement item bulk-insert as one transaction. Approved changes are rejected before opening the transaction. Any failure rolls back the complete write set, preventing a partially updated financial change document.

The earlier stage-5 journal change remains in `backend/controllers/lkJurnalController.js` and `backend/services/lkSaldoService.js`, where journal post/void and saldo application use transactional/row-lock paths.

## Verification status

| Check | Status | Evidence |
|---|---|---|
| DPA workflow controller parses | `Verified` | `node --check backend/controllers/dpaPergeseranController.js` passed. |
| Header/item atomicity | `Partially Verified` | Transaction options and commit/rollback paths are present in source; disposable database integration test is still required. |
| Concurrent pergeseran numbering | `Not Verifiable` | Requires concurrent disposable-database test and a uniqueness constraint/locking decision. |
| Approval plus derived total synchronization | `Open` | `syncDpaTotalSetelahPerubahan` is called after status mutation; end-to-end atomicity across the sync service still needs a transaction contract. |
| Maker-checker and role restrictions | `Open` | Requires owner-approved SoD matrix and route integration tests. |

## Required acceptance tests

Run two concurrent synthetic create requests for the same DPA and assert unique numbering, no orphan header/item rows, and balanced KURANG/TAMBAH totals. Force a bulk item failure and assert no header remains. For perubahan, force item replacement failure and assert the previous draft remains intact. Test that approved changes cannot be modified and that approval plus derived pagu synchronization has a defined transaction boundary.

## Residual risks

No database migration or uniqueness constraint was added in this stage because the authoritative migration chain and database engine were not verified. Financial workflow status changes and derived-total synchronization still require a disposable database test. Status: `Fixed Pending Retest`.
