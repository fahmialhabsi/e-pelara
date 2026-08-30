# Option C Final Decision Package — Owner/DBA Review v5

**Date:** 2026-08-30  
**Decision scope:** Control policy and preparation plan only; this document is **not authorization to activate**.  
**System status:** `NOT READY`.  
**AUD-003:** `Fixed Pending Retest / Open Release Blocker`.  
**Production access:** `NOT_USED`.  
**Active migration chain:** `NOT_RUN`.

## Executive decision

Adopt Option C as the control policy: preserve every historical migration file immutably, run a fail-closed controlled chain gate before any active migration command, require sanitized applied-history evidence for upgrades, explicitly block duplicate-prefix and premature AUD-003 conditions, and keep the guarded forward-fix outside the active chain until all required evidence and approvals exist.

This decision does not rename, reorder, import, edit, or execute historical migrations. It does not change real `SequelizeMeta`, delete raw duplicate data, choose an authoritative row, or authorize production activity.

## Recommended fresh-install policy

The recommended long-term fresh-install strategy is a **clean baseline**: a separately versioned, deterministic schema baseline that does not execute the conflicted legacy chain. The legacy chain remains immutable and is handled by a separate upgrade/compatibility path. This choice has higher initial schema mapping and governance cost but reduces fresh-install dependence on duplicate prefixes and premature dependencies.

A compatibility runner remains the recommended transitional strategy for existing upgrade environments. It must use exact sanitized applied history, an explicit dependency manifest, durable decision records, and a fail-closed response. It must not silently skip, reorder, mark an unapplied migration as applied, or invent a `SequelizeMeta` marker.

| Decision dimension | Clean baseline | Compatibility runner |
|---|---|---|
| Primary use | New installations | Existing upgrades |
| Legacy filenames | Kept immutable but outside new baseline | Kept immutable and reconciled by applied history |
| Fresh-install reliability | Higher after independent baseline review | Lower because exceptions and legacy conflicts remain |
| Operational complexity | Higher during baseline creation; lower at runtime | Lower initial schema work; higher runtime metadata/orchestration complexity |
| Main risk | Drift between baseline and upgrade path | Metadata divergence or unsafe compatibility exception |
| Required approval | Baseline schema, data model, version and rollback | Applied-history source, compatibility manifest, skip/forward-fix policy and recovery |
| Current state | Recommended, not implemented/activated | Gate/draft prepared, not activated |

## Dependency policy for four duplicate prefixes

Duplicate prefix resolution is an ordering/dependency decision, not permission to merge data or rename files. The exact pair policy must be recorded by the DBA with predecessor, required schema object, applied-history expectation, and failure consequence.

| Prefix | Files | Required control |
|---|---|---|
| `20260412120000` | `add-indikator-renstra-tahun6-lokasi-pagu.js`; `planning-line-item-change-log.js` | Preserve both. Review shared columns and tables; any compatibility repair uses a new unique prefix. |
| `20260424120000` | `create-renja-mapping-apply-batch.js`; `multi-tenant-saas-core.js` | Treat multi-tenant core as a possible prerequisite. No tenant backfill or FK change without approved scope/source. |
| `20260428120000` | `add-tahun-2025-urusan-kinerja.js`; `planning-audit-rka-dpa.js` | Review year-specific columns and RKA/DPA audit prerequisites independently. |
| `20260720120000` | `create-pejabat-penandatangan.js`; `widen-rka-kode-unik-sub-kegiatan.js` | Review signing metadata and RKA uniqueness separately; duplicate business records must not be hidden by an index. |

**Default ordering rule:** never rely on lexical order. Do not rename or reorder old files unless the DBA proves neither file was applied in any environment and the owner approves the change. The current evidence does not satisfy that condition.

## Applied-history reconciliation procedure

The procedure is applicable only to nonproduction environments and must use sanitized `SequelizeMeta` or an equivalent metadata export.

1. Identify environment owner, nonproduction classification, host, database, schema fingerprint, and export time. Reject any production target.
2. Export only exact migration names and explicitly approved metadata. Remove credentials, tokens, connection strings, application data, PII, and unrelated rows.
3. Record export hash, sanitization method, source owner, and independent reviewer.
4. Compare exact applied names to the immutable 264 active-candidate inventory. Do not infer applied state from filename absence or prefix.
5. Report duplicate-prefix markers, AUD-003 markers, missing repository files, extra applied names, and unknown names.
6. For upgrade mode, missing history is `Not Verifiable` and blocks. Applied names absent from the repository are `Conflict` and block.
7. Produce a durable environment decision: `PASS`, `BLOCK`, `CONFLICT`, or `NOT_VERIFIABLE`.
8. Retain the sanitized export, hash, comparison, schema fingerprint, decision, and reviewer evidence according to approved retention policy.

The disposable simulation proved only that sanitized history can be transported and read while the gate still blocks unresolved conflicts. It is not evidence of real environment applied history.

## Authoritative-row and FK reconciliation

The attached policy `audit/authoritative-row-fk-reconciliation-policy-v5.md` is the governing draft. It prohibits raw-data deletion and ID guessing. The provisional RPJMD candidate key is `(tenant/OPD scope, periode_id, jenis_dokumen, tahun, kode_indikator)` and must be owner-approved per domain.

The authority sequence is owner-approved source/import manifest; final/approved workflow event; valid lineage and FK integrity; complete approved attributes; effective business version; stable source identifier; and numeric ID/timestamp only as an approved final tie-breaker. Child reference counts are supporting evidence only.

A tied or conflicting group is `Conflict`/`No Decision`, remains quarantined, and blocks unique-index promotion. Before any FK update, inventory direct FKs, soft references, join tables, denormalized IDs, audit/history, and file metadata. Require mapping completeness, child coverage, no orphan, count preservation, business invariants, old/new ID auditability, independent review, and disposable reversibility. Physical deletion requires a separate written data-owner/DBA/retention approval.

## Activation sequence

Activation remains outside the current authorization. If the owner/DBA later approves, the sequence is:

1. Approve fresh-install and upgrade strategy.
2. Provide sanitized applied history for each upgrade environment.
3. Approve the dependency decision for all four prefixes and AUD-003 compatibility behavior.
4. Approve candidate grouping key, authoritative-row criteria, quarantine, FK mapping, and reviewer.
5. Capture disposable schema/data snapshot and invariant baseline.
6. Run empty, representative upgrade, existing-index, missing-column, duplicate-key, injected-failure, and restore tests.
7. Complete independent code/SQL and recovery review.
8. Run controlled gate; any block stops the process.
9. Promote forward-fix from draft only after explicit nonproduction approval.
10. Re-run applied-history, schema, data, index, FK, invariant, and recovery evidence after activation.

## Rollback, compensation, and recovery

The forward-fix must refuse duplicates and stop before mutation on missing tables, columns, approval, or unsafe target. For transactional DML, rollback and verify row counts, mappings, and orphan counts. For DDL or mixed DDL/DML, use a disposable snapshot/recreate strategy and compare schema fingerprint, checksums, indexes, constraints, and row counts.

No compensation may select an authoritative row automatically. If a mapping has been approved, preserve the original child parent ID in an immutable mapping/history artifact. Failure recovery must identify the failed step, partial state, restore result, and invariant comparison. This sequence is prohibited on production.

## Required evidence and approvals

| Requirement | Owner | Status |
|---|---|---|
| Sanitized `SequelizeMeta` per real nonproduction upgrade environment | DBA/environment owner | `Not Verifiable` |
| Fresh-install strategy | Owner/DBA | Pending |
| Four-prefix dependency/order record | DBA/architecture owner | Pending |
| AUD-003 duplicate/FK authority policy | Data owner/DBA | Draft only |
| Complete child-reference inventory | Domain owners/DBA | `Not Verifiable` |
| Disposable snapshot and restore proof | Operations/DBA | Synthetic disposable proof only |
| Independent review | Independent DBA/security reviewer | Pending |
| Forward-fix promotion approval | Owner/DBA | Not approved |
| Production change approval | Out of scope | Not requested and prohibited |

## Disposable retest before any nonproduction activation

The following must pass on a guard-verified disposable target:

- empty install and missing prerequisite fail-closed;
- representative upgrade with sanitized applied history;
- existing index and repeated forward-fix idempotency;
- missing column/table guard;
- duplicate key guard with all raw rows preserved;
- injected failure before each multi-step mutation and verified rollback/recovery;
- disposable snapshot and restore with schema, row-count, checksum, FK, orphan, and index comparison;
- controlled gate behavior for duplicate prefix, AUD-003, missing history, unknown applied name, and approved history;
- authoritative-row quarantine and FK mapping simulation without physical deletion; and
- independent reviewer confirmation that no test uses production data or credentials.

## AUD-003 closure rule

`AUD-003` may become `Closed Verified` only when implementation, integration test, security test, evidence path, named owner, independent reviewer, rollback/recovery evidence, and retest timestamp are all present. Current disposable evidence is bounded verification only. Real applied history, full active-chain fresh/upgrade, full-chain failure/recovery, owner/DBA activation, and production operational evidence remain `Not Verifiable` or pending.

## Final recommendation

Approve Option C as a **control policy and preparation plan**. Use clean baseline for future fresh installs if the organization accepts separate baseline governance. Use immutable legacy history plus sanitized applied-history reconciliation, controlled gate, and guarded forward-fix for existing upgrades. Do not activate either path until the evidence and approval matrix is complete.

Current final status remains:

- System: `NOT READY`.
- AUD-003: `Fixed Pending Retest / Open Release Blocker`.
- Controlled gate: `Implemented / Fail-Closed / Nonactive`.
- Forward-fix: `Disposable-Tested / Nonactive / Draft`.
- Production migration: `Prohibited`.
