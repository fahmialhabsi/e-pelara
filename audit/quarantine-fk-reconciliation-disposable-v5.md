# Quarantine and FK Reconciliation Disposable Simulation — v5

**Date:** 2026-08-30  
**Target:** `epelara-audit-v5-mysql` / `epelara_audit_v5` / `127.0.0.1:13317`.  
**Production access/data:** `NOT_USED`.  
**Active migration execution:** `NOT_RUN`.

## Scope

The simulation creates synthetic parent and child tables, two parent candidates with the same tenant-scoped business key, a quarantine table, and an empty FK mapping table. It tests the policy behavior when no authoritative-row decision exists. It must preserve both raw parent rows, preserve child parent references, reject FK remapping, and avoid unique-index promotion or physical deletion.

The synthetic business key is `tenant_id + kode_indikator`; the test does not infer authority from maximum numeric ID, child count, timestamp, or client input.

## Results

| Check | Result |
|---|---|
| Exact disposable container/database/loopback guard | `PASS` |
| Synthetic duplicate candidate group detected | `PASS` |
| Both raw candidates copied to quarantine | `PASS` — both decisions are `CONFLICT` |
| Physical raw-data deletion | `NOT_RUN` |
| Authoritative-row decision absent | `PASS` — remains unresolved |
| FK mapping before authority | `PASS` — empty |
| FK remapping attempt | `BLOCKED` — authoritative decision required |
| Parent/child rows after block | `PASS` — unchanged |
| Orphan introduced | `PASS` — none introduced |
| Active migration chain | `NOT_RUN` |
| Production access/data | `NOT_USED` |

The process exited with code `0`. The expected policy result is a controlled rejection, not a successful merge.

## Interpretation

The test verifies that unresolved duplicate candidates are quarantined and that child references are not remapped without a written authoritative-row decision. It does not approve any row, delete any raw record, or prove production data quality. A future approved mapping must include all candidate IDs, all child references, owner and independent reviewer, reason, evidence, timestamp, and a reversible disposable plan.

## Status

`Verified` for non-destructive quarantine and FK blocking behavior on synthetic data. Real application-table FK coverage is `Not Verifiable` until schema and soft-reference inventory is completed for the target environment. AUD-003 remains `Fixed Pending Retest / Open Release Blocker`.
