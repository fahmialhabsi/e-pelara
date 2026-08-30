# Option C Decision Package — Owner/DBA Review v5

**Date:** 2026-08-30  
**Scope:** e-PeLARA/e-SIGAP migration chain, AUD-003, four duplicate active prefixes, and non-destructive duplicate/FK reconciliation.  
**Current system status:** `NOT READY`.  
**AUD-003 status:** `Fixed Pending Retest / Open Release Blocker`.  
**Activation status:** Not approved; no activation is requested by this package.

## Executive decision

Option C means: preserve every historical migration file immutably; place an explicit controlled chain gate before any active migration execution; require sanitized applied-history evidence for upgrade environments; block duplicate prefixes and the premature AUD-003 dependency explicitly; and keep the forward-fix outside the active migration directory until owner/DBA approval and disposable evidence are complete.

The package is a decision aid, not an activation authorization. It does not rename, reorder, import, execute, or modify historical migrations; it does not change real `SequelizeMeta`; it does not delete duplicate data; and it does not select an authoritative row.

## Current evidence

| Evidence | Result | Interpretation |
|---|---|---|
| Active-candidate JavaScript migrations | 264 | Complete repository list is in `audit/active-migration-dba-review-v5.csv/json`. |
| Migration-path files | 532 current; 531 before the v5 draft | Current count includes the forward-fix draft. |
| Duplicate active prefixes | 4 | Active chain remains blocked. |
| Applied history | 264 × `Not Verifiable` | Repository filenames are not proof of applied state. |
| AUD-003 disposable draft tests | Passed | Limited to synthetic empty/representative/duplicate/idempotency/failure/restore behavior. |
| Controlled gate | Implemented and fail-closed | It blocks unresolved duplicate/AUD-003 conditions and does not silently skip. |
| Production | Not used | No production database, storage, credential, or data was accessed. |

## Fresh install versus upgrade

| Dimension | Clean baseline for fresh install | Compatibility runner / preserved legacy chain |
|---|---|---|
| Main idea | Build a new deterministic baseline for new installations; keep historical chain separate. | Preserve legacy filenames and use an explicit runner/gate to handle known conflicts. |
| Applied-history risk | Low for new installations if baseline is independently reviewed. | Higher; requires sanitized `SequelizeMeta` and environment-specific reconciliation. |
| Existing environments | Not a migration path for existing databases. | Intended for upgrades, subject to applied-history evidence. |
| Duplicate prefixes | Removed from the new baseline, but must be mapped from legacy history. | Remain immutable; gate blocks until dependency decision is recorded. |
| AUD-003 | Correct order can be built into baseline. | Old migration remains blocked; guarded forward-fix is appended only after review. |
| Operational cost | High initial schema/data mapping and dual-run documentation. | Lower initial disruption but higher runtime and metadata complexity. |
| Recommendation | Preferred long-term fresh-install strategy if owner accepts a separate baseline. | Preferred compatibility path for existing environments if applied history is available. |
| Status now | Not selected. | Not activated; gate remains blocking. |

A compatibility runner must not silently skip a migration. If a known premature migration must not execute, the runner must stop with a durable decision record, explicit migration-state mapping, operator approval, and a tested recovery path. Writing an artificial applied marker without executing or otherwise reconciling the skipped migration is not authorized by this package.

## Dependency/order policy for four duplicate prefixes

The duplicate prefix is treated as a deterministic-order and applied-history risk, not as permission to reorder files. The authoritative order must come from schema dependencies and applied evidence, not lexical filename order.

| Prefix | Files | Required policy |
|---|---|---|
| `20260412120000` | `add-indikator-renstra-tahun6-lokasi-pagu.js`; `planning-line-item-change-log.js` | Preserve both. Inventory shared columns and table dependencies. Any compatibility change uses a new unique prefix. |
| `20260424120000` | `create-renja-mapping-apply-batch.js`; `multi-tenant-saas-core.js` | Treat multi-tenant core as a potential prerequisite. No tenant backfill without approved scope/source and FK evidence. |
| `20260428120000` | `add-tahun-2025-urusan-kinerja.js`; `planning-audit-rka-dpa.js` | Review year-specific and RKA/DPA audit prerequisites independently; do not rely on lexical order. |
| `20260720120000` | `create-pejabat-penandatangan.js`; `widen-rka-kode-unik-sub-kegiatan.js` | Review signing metadata and RKA uniqueness independently; an index change cannot conceal duplicate business records. |

**Ordering rule:** for each pair, DBA must record predecessor, required schema object, applied-history expectation, and failure consequence. If one file is already applied and the other is not, do not infer that the second can safely run from the repository order. The gate blocks until the pair-specific decision is recorded.

## Applied-history reconciliation procedure

The procedure uses sanitized `SequelizeMeta` or equivalent metadata only. It must never include passwords, tokens, application rows, PII, connection strings, or production data.

1. Identify the target environment with a nonproduction owner, database name, host classification, and schema fingerprint. Reject production targets.
2. Export only migration names, migration metadata timestamps if approved, and a hash of the export. Remove credentials, application data, and unrelated columns.
3. Record source, export time, environment owner, sanitization method, and reviewer.
4. Compare applied names to the 264 active-candidate inventory using exact filename matching. Do not infer “unapplied” from absence in a repository or from a filename prefix.
5. Identify duplicate-prefix pairs, AUD-003 markers, missing files, extra applied names, and unknown names.
6. For upgrade mode, any missing applied history is `Not Verifiable` and blocks. Any applied name not found in the immutable repository is a conflict requiring DBA review.
7. Produce a decision record per environment: `PASS`, `BLOCK`, `CONFLICT`, or `NOT_VERIFIABLE`. A gate `PASS` means only that history is sufficiently reconciled for the approved policy; it does not mean the chain is safe if duplicate/AUD-003 conflicts remain.
8. Retain the sanitized export, comparison output, schema fingerprint, reviewer identity, and decision record according to the approved audit-retention period.

The current audit disposable simulation inserted three synthetic migration names into a temporary `SequelizeMeta` table and proved that the gate accepts supplied history but still returns `BLOCK` for unresolved chain conflicts. This is not applied-history evidence for any real environment.

## Authoritative-row and FK reconciliation policy

The full draft is in `audit/authoritative-row-fk-reconciliation-policy-v5.md`. Its mandatory controls are:

| Control | Rule |
|---|---|
| Candidate grouping | Owner approves domain key; RPJMD provisional key is `(tenant/OPD scope, periode_id, jenis_dokumen, tahun, kode_indikator)`. |
| Authority | Use owner-approved source, approved workflow event, valid lineage, complete approved attributes, effective version, and stable source ID in order. |
| Tie/conflict | Mark `Conflict` or `No Decision`; quarantine all raw rows; stop unique-index promotion. |
| Child coverage | Inventory direct FKs, soft references, joins, denormalized IDs, audit/history, and file/document metadata. |
| Preservation | Keep raw rows and old IDs; preserve parent/child counts before optional cleanup. |
| Audit | Record old/new IDs, operator, owner, reviewer, reason, evidence, and timestamp. |
| Deletion | Prohibited by this package; requires a separate written data-owner/DBA/retention approval. |
| Reversibility | Require disposable mapping reversal or snapshot restore before any future cleanup. |

No row is authoritative merely because it has the greatest numeric ID, newest `updated_at`, or most child references.

## Activation sequence

Activation is a future, separately approved action. The safe sequence is:

1. Owner/DBA approves this decision package and the fresh/upgrade strategy.
2. DBA supplies sanitized applied history for each intended upgrade environment.
3. DBA records the dependency decision for all four duplicate prefixes and AUD-003.
4. Data owner approves the authoritative-row grouping key, duplicate policy, FK mapping policy, quarantine retention, and reviewer.
5. Capture a disposable schema/data snapshot and baseline invariant report.
6. Run empty, representative upgrade, existing-index, missing-column, duplicate-key, injected-failure, and restore scenarios.
7. Run independent review of draft code, SQL, guard conditions, and recovery artifacts.
8. Run the controlled gate. Any block stops the process.
9. Only after a gate pass and explicit nonproduction approval may a forward-fix be promoted from draft and activated in a designated nonproduction environment.
10. Repeat applied-history, invariant, and recovery evidence after activation. Production remains outside this package.

## Rollback, compensation, and recovery

The forward-fix must remain index-only and refuse duplicate data. If any precondition fails, stop before mutation. If a multi-step disposable operation fails, record the exact step, transaction status, partial schema state, row counts, checksums, orphan counts, and index state.

For transactional DML, rollback the transaction and verify counts and mappings. For DDL or mixed DDL/DML where transactional behavior is engine/operation-dependent, recreate or restore the disposable target from a pre-operation snapshot, then compare schema and data invariants. A compensation plan must be approved before any non-reversible action. Do not attempt this recovery sequence against production.

## Evidence and approvals still required

| Evidence/approval | Owner | Current status |
|---|---|---|
| Sanitized applied history per real nonproduction upgrade environment | DBA/environment owner | Not Verifiable |
| Fresh-install strategy | Owner/DBA | Pending decision |
| Compatibility behavior for each duplicate prefix | DBA/architecture owner | Pending decision |
| AUD-003 duplicate/FK authoritative-row policy | Data owner/DBA | Draft only |
| Complete child-reference inventory | Domain owners/DBA | Not Verifiable |
| Schema/data snapshot and restore proof | DBA/operations | Disposable synthetic proof only |
| Independent code/SQL review | Independent reviewer | Pending |
| Forward-fix promotion approval | Owner/DBA | Not approved |
| Production change approval | Out of scope | Not requested and prohibited |

## AUD-003 retest plan

AUD-003 can move to `Closed Verified` only when every stage below passes and evidence is attached.

### Phase A — Applied-history and schema preparation

- Obtain sanitized `SequelizeMeta` for each approved nonproduction upgrade environment.
- Verify exact migration names, missing/extra entries, duplicate-prefix exposure, and repository hash.
- Capture schema fingerprint and identify whether each target indicator table and required column exists.
- Inventory all child FKs/soft references and produce an orphan baseline.

### Phase B — Data-authority decision

- Produce duplicate candidate groups using the owner-approved domain key.
- Preserve raw rows and generate field-difference, workflow, lineage, and child-reference reports.
- Obtain named data-owner decision and independent reviewer for every group.
- Keep tied/conflicted groups quarantined; do not create a unique index over unresolved duplicates.

### Phase C — Forward-fix disposable matrix

- Empty install: missing-table guard blocks without mutation.
- Representative upgrade: sanitized applied-history marker is accepted but unresolved chain conflict still blocks.
- Existing index: repeated forward-fix is idempotent.
- Missing column: guard blocks before index mutation.
- Duplicate key: guard blocks and preserves all rows.
- Injected failure: verify rollback/restore and no silent continuation.
- Snapshot/restore: verify schema, row count, hash, FK, and index state after restore.
- Full-chain fresh/upgrade: only after owner approves a chain strategy; never use production.

### Phase D — Closure evidence

Attach source commit, test command, exit codes, target/environment identity, sanitized fixture hash, logs without secrets, schema/invariant report, recovery evidence, owner approval, independent reviewer, residual risk, and retest timestamp. Only then may the status become `Closed Verified`.

## Decision recommendation

Choose **clean baseline for future fresh installations** if the owner accepts separate baseline governance and a migration/data mapping program. For existing environments, choose **preserve immutable legacy history + explicit controlled gate + guarded forward-fix**. This minimizes applied-history breakage while refusing silent skip and destructive duplicate selection.

If the owner cannot provide applied history or authoritative-row/FK decisions, the correct status is `Not Verifiable` or `Open`, not `Compliant` or `Closed Verified`. The system remains **NOT READY** and AUD-003 remains **Fixed Pending Retest / Open Release Blocker**.

## References

- `audit/aud003-status-consolidation-v5.md`
- `audit/migration-decision-record-v5.md`
- `audit/controlled-migration-chain-gate-v5.md`
- `audit/authoritative-migration-inventory-v5.md`
- `audit/migration-applied-history-reconciliation-v5.md`
- `audit/authoritative-row-fk-reconciliation-policy-v5.md`
- `audit/optionc-forward-fix-rollback-plan-v5.md`
- `audit/migration-invariant-report-v5.md`
- `audit/optionc-disposable-test-matrix-v5.md`
- `audit/upgrade-gate-disposable-simulation-v5.md`
- `audit/upgrade-gate-failure-recovery-v5.md`
