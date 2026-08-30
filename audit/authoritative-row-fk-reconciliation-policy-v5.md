# Authoritative-Row and FK Reconciliation Policy Draft — v5

**Date:** 2026-08-30  
**Scope:** AUD-003 indicator deduplication risk and schema conflicts associated with four duplicate migration prefixes.  
**Status:** Draft for owner/DBA approval.  
**Data mutation:** No data is deleted or selected by this document.

## Purpose

This policy defines how the project may determine an authoritative parent row and reconcile child foreign keys without deleting raw records or guessing from an auto-increment ID. It applies before any destructive deduplication, unique constraint enforcement, or forward-fix that depends on a single authoritative business key.

The current AUD-003 forward-fix intentionally refuses duplicate `kode_indikator` data. This policy is a prerequisite for any later data reconciliation; it does not authorize execution by itself.

## Definitions

| Term | Definition |
|---|---|
| Raw record | Original row preserved exactly, including source identifier, timestamps, status, and audit metadata. |
| Candidate group | Rows sharing the same normalized business key within the same tenant/OPD, period, document type, and approved scope. |
| Authoritative row | A row selected by the ordered criteria below and approved by the data owner; it is not necessarily the row with the greatest ID. |
| Quarantine | An immutable review set that prevents normal unique-index promotion while preserving every candidate row. |
| FK reconciliation | A reviewed mapping from child references to the approved parent row, with orphan and count checks before/after. |

## Scope boundary

The candidate grouping key must be approved per domain. For RPJMD indicators, the provisional grouping key is `(tenant/OPD scope, periode_id, jenis_dokumen, tahun, kode_indikator)`. If the relevant table has no tenant/OPD column, the owner must approve the scope source before grouping. A global master/reference record must not be mixed with operational tenant data.

The policy does not allow a system operator to infer scope from a client request, filename, current login, or maximum numeric ID.

## Authoritative-row decision hierarchy

Apply these criteria in order. Stop and mark `Conflict` if two candidates remain tied or if any criterion has conflicting evidence.

| Rank | Criterion | Evidence required |
|---:|---|---|
| 1 | Explicit owner-approved source or official import manifest identifies the row | Signed source manifest, import batch ID, or data-owner approval. |
| 2 | Official workflow status is final/approved and has a valid approval event | Approval/event log with actor, role, timestamp, transition, and document version. |
| 3 | Row participates in a valid document lineage and all required parent references are intact | FK graph and orphan report. |
| 4 | Row has the most complete approved business attributes without conflicting values | Field-level comparison and owner decision for conflicting values. |
| 5 | Row is referenced by the greatest number of valid children, only as supporting evidence | Child-reference report; reference count alone cannot decide authority. |
| 6 | Latest effective business version within the approved period/document scope | Effective date/version evidence; `updated_at` alone is insufficient. |
| 7 | Stable source-system identifier or deterministic import sequence | Source-system contract and import log. |
| 8 | `created_at`/numeric ID | Tie-breaker only after all higher criteria are equal and owner approves; never a standalone authority rule. |

If no candidate satisfies a criterion with reliable evidence, the group remains quarantined. The system must not delete, overwrite, or create a unique index that would conceal the conflict.

## Non-destructive reconciliation workflow

1. Freeze the candidate scope in a disposable snapshot or immutable export. Record database identity, schema hash, migration metadata, and query timestamp.
2. Normalize only for comparison; preserve original values and identifiers in the raw snapshot.
3. Generate a candidate-group report with key, candidate IDs, field differences, workflow history, valid child counts, and FK graph.
4. Assign each group to a named data owner and independent reviewer. No service account may self-approve its own reconciliation.
5. Record one of `AUTHORITATIVE`, `MERGE_REQUIRES_OWNER`, `CONFLICT`, or `NO_DECISION`. `CONFLICT` and `NO_DECISION` remain quarantined.
6. Create an immutable mapping artifact from candidate ID to decision, including reason, evidence, owner, reviewer, and timestamp. This mapping is the only input permitted to a later FK reconciliation operation.
7. Reconcile children to the approved parent only after the mapping is approved. Preserve the original child parent ID in an audit mapping/history table or immutable export.
8. Re-run invariants and reconciliation reports. A failure rolls back the disposable operation or restores the disposable snapshot; it never proceeds to deletion.

## FK reconciliation controls

Before any child update, inventory every FK and soft-reference column pointing to the parent table, including raw SQL references and application-level IDs. The inventory must cover direct foreign keys, nullable references, join tables, denormalized source IDs, audit/history tables, and file/document metadata.

For each proposed mapping, require:

| Control | Acceptance criterion |
|---|---|
| Mapping completeness | Every candidate parent has exactly one decision; no unclassified duplicate remains in the proposed scope. |
| Child coverage | All known child columns are included; unknown references are a blocker. |
| Referential validity | No child becomes orphaned; all required parent keys exist after mapping. |
| Count preservation | Child row count and raw candidate row count are unchanged before any optional cleanup. |
| Business invariant | Period, tenant/OPD, document type, status, amount, and approval invariants remain valid. |
| Auditability | Old parent ID, new parent ID, operator, owner, reviewer, timestamp, reason, and evidence are recorded. |
| Reversibility | Mapping can be reversed in disposable or restored from snapshot before any cleanup. |

Physical deletion is outside this policy and requires a separate written retention/legal/data-owner approval. The first approved release should preserve duplicate raw rows in quarantine and enforce uniqueness only after the quarantine population is zero or explicitly excluded by an approved model.

## Policy for the four duplicate migration prefixes

The duplicate prefix conflicts are ordering conflicts, not permission to merge data. Each pair requires a dependency decision and applied-history reconciliation. The following rules apply:

| Prefix | Policy |
|---|---|
| `20260412120000` | Preserve both filenames. Review whether Renstra field changes or planning line-item audit changes depend on shared columns. Use a new compatibility/forward-fix only after schema inventory. |
| `20260424120000` | Treat multi-tenant core as a potential prerequisite for any tenant-scoped mapping. Do not backfill tenant values until owner approves scope and source. |
| `20260428120000` | Review RKA/DPA audit prerequisites and year-specific columns independently; do not assume lexical order is business order. |
| `20260720120000` | Review signing metadata and RKA uniqueness independently; an index change must not conceal duplicate business records. |

No pair may be resolved by renaming/reordering old files unless DBA proves that both files were never applied in any environment and owner approves the change.

## Rollback and recovery

A disposable snapshot or logical dump must be captured before any FK reconciliation test. If any invariant, mapping completeness, or child coverage check fails, stop, restore/recreate the disposable target, and compare the pre/post schema, row counts, checksums, and orphan counts. The rollback procedure must not be tested against production.

## Required owner/DBA approvals

The owner/DBA must approve the domain grouping key, authoritative criteria order, retention/quarantine period, data owner and independent reviewer, all child references, acceptable business invariants, and the no-delete/forward-fix strategy. Without these approvals, duplicate rows remain `Conflict` and AUD-003 cannot be closed.

## Status

`Draft / Pending owner-DBA approval`. This policy is evidence preparation only. It does not delete raw data, select an authoritative row, modify a migration, or authorize production execution.
