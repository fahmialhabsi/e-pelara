# Authoritative Migration Inventory and Forward-Fix Review — v5

**Date:** 2026-08-30  
**Branch:** `remediation/epelara-esigap-audit-v3`  
**Scope:** Repository-only inventory and review. No active migration was imported or executed. No production database, migration history, credential, or data was accessed.

## Executive conclusion

The repository inventory is comprehensive as a **candidate inventory**, but it is not yet authoritative for applied history. The current tree contains 532 migration-path files after adding the v5 draft: 264 active-candidate JavaScript files at the top level, 264 nested backup/nonactive files, one draft, and three non-JavaScript path entries. The prior count of 531 reconciles as the pre-draft tree; the additional current file is the new draft under `backend/migrations/drafts/`.

The active candidate chain contains four duplicate timestamp prefixes and four non-strict transitions. Static dependency extraction produces 118 table/reference edges, of which 14 are out-of-order or ambiguous; the focused conflict graph is supplied separately. Filename order is therefore only a repository candidate order, not an execution authority.

The disposable AUD-003 test is valid evidence for the draft’s limited behavior: empty-schema fail-closed, representative synthetic schema, duplicate-key fail-closed, idempotent index creation, and index-only down path all passed. It does not validate the historical active chain, applied migration history, upgrade path, failure recovery, or production state. `AUD-003` remains `Fixed Pending Retest / Open Release Blocker`.

## Inventory and reconciliation

| Category | Count | Interpretation |
|---|---:|---|
| Recursive files under `backend/migrations` before v5 draft | 531 | Prior Stage 0–2 inventory. |
| Current recursive files | 532 | Prior tree plus the new draft file. |
| Top-level active-candidate JavaScript files | 264 | Files that a default Sequelize migration path may consider active. |
| Nested backup/nonactive files | 264 | Backup/archive/nonactive copies; not active candidates. |
| Draft files | 1 | `backend/migrations/drafts/20260830120000-rpjmd-indicator-unique-forward-fix.draft.js`; deliberately not active. |
| Other non-JavaScript migration-path entries | 3 | Included in recursive file count but not executable JavaScript migration candidates. |
| Active prefixes missing/nonstandard | 0 | All 264 active JavaScript candidates have a parseable prefix under the inventory rule. |
| Duplicate active prefixes | 4 | Requires owner/DBA decision; no rename/reorder performed. |
| Non-strict active transitions | 4 | All correspond to duplicate prefixes. |

The complete per-file mapping is in `audit/authoritative-migration-inventory-v5.csv` and `.json`. Each record contains relative path, classification, prefix, repository predecessor candidate, predecessor confidence, `up`/`down` presence, created tables, referenced objects, changed columns, schema operation tags, dependency references, destructive tags, unique/index/FK tags, SHA-256, size, and applied status.

The applied status for every active file is `unknown_not_verifiable`. Repository filenames and code cannot establish whether a migration has run in any environment. Nested backup/nonactive files are marked `not_applicable_nonactive_copy`; the draft is marked `draft`. A per-environment `SequelizeMeta` or equivalent history export, captured without production access, is required to make applied status authoritative.

## Full-file mapping interpretation

The inventory uses top-level `backend/migrations/` as the active-candidate boundary and `backend/migrations/backup/` or other nested paths as nonactive copies. It does not infer that a file is safe merely because it has a `down` export. It tags table creation, column change, index, unique, FK/reference, raw SQL, delete/destroy, drop, remove, rename, and other operations for owner/DBA review. The `predecessor` column is a lexical candidate only; `predecessor_confidence=repository_lexical_order_only` explicitly prevents it from being treated as a verified dependency.

Operation counts among active candidates include 128 create-table operations, 116 add-column operations, 115 remove-column operations, 143 add-index operations, 41 remove-index operations, 44 raw-SQL migration files, 23 constraint additions, 11 constraint removals, 14 change-column operations, one delete/destroy-tagged file, and 128 drop-table operations. These counts are risk tags, not execution results; `down` definitions account for many drop/remove operations.

## Duplicate-prefix analysis

| Prefix | Conflicting active files | Dependency/order risk |
|---|---|---|
| `20260412120000` | `20260412120000-add-indikator-renstra-tahun6-lokasi-pagu.js`; `20260412120000-planning-line-item-change-log.js` | Execution order is filename-dependent; line-item change-log and Renstra additions may observe different schema state. |
| `20260424120000` | `20260424120000-create-renja-mapping-apply-batch.js`; `20260424120000-multi-tenant-saas-core.js` | Renja mapping and multi-tenant core ordering is ambiguous; tenant columns/constraints may precede or follow dependent writes. |
| `20260428120000` | `20260428120000-add-tahun-2025-urusan-kinerja.js`; `20260428120000-planning-audit-rka-dpa.js` | Planning audit and year-specific schema changes have no deterministic timestamp precedence. |
| `20260720120000` | `20260720120000-create-pejabat-penandatangan.js`; `20260720120000-widen-rka-kode-unik-sub-kegiatan.js` | Signing metadata and RKA uniqueness changes may run in different lexical order than intended. |

The full graph is in `audit/migration-dependency-graph-v5.json` and `audit/migration-dependency-graph-v5.mmd`. The focused graph contains 36 conflict/dependency nodes and static edges; it is not a proof of runtime execution order.

## AUD-003 dependency-aware analysis

The historical migration `backend/migrations/20260218120000-rpjmd-indikator-kode-dedupe-unique.js:23-43` performs duplicate-row deletion and unique-index creation against seven indicator tables. Three of those tables are created later by:

| Table | Creator | Evidence |
|---|---|---|
| `indikatorstrategis` | `20260415110001-create-indikatorstrategis.js` | `:4-5` creates the table; `:12-34` defines `id` and `kode_indikator`. |
| `indikatorarahkebijakans` | `20260415110002-create-indikatorarahkebijakans.js` | `:4-5` creates the table; `:12-35` defines `id` and `kode_indikator`. |
| `indikatorsubkegiatans` | `20260415110003-create-indikatorsubkegiatans.js` | `:4-5` creates the table; `:11-36` defines `id` and `kode_indikator`. |

This is an out-of-order dependency if those files are in the same fresh-install chain. The old migration also contains destructive deduplication and a non-restoring `down` path, so automatically choosing the maximum ID or deleting rows is not an acceptable forward-fix without owner-approved data policy.

## Ordering options

| Option | Description | Risk | Recommendation |
|---|---|---|---|
| A — Rename/reorder existing files | Change duplicate timestamps or move the old dedupe migration after table creation. | Breaks environments that may already have applied filenames; can make `SequelizeMeta` diverge and cause partial/repeated execution. | **Reject by default.** Only consider if DBA proves the files were never applied anywhere and owner approves. |
| B — Preserve chain and append guarded forward-fix | Leave all old files immutable and add a new migration after authoritative applied history, with table/column/duplicate/index guards. | Does not repair a fresh install if the old chain fails before reaching the forward-fix; requires a separate compatibility/skip strategy for the premature old file. | **Preferred compatibility path** after applied-history and fresh-chain strategy are approved. |
| C — New compatibility migration plus controlled chain gate | Add a new forward-fix and adjust the migration runner/chain policy so the known premature operation is blocked or handled without renaming historical files. | Requires explicit deployment tooling and careful `SequelizeMeta`/fresh-install policy; not a simple migration-only change. | **Preferred for fresh-install safety** if platform owner approves runner/chain policy. |
| D — Rebuild a new clean chain | Create a new baseline schema/chain for fresh environments and preserve legacy upgrade path separately. | High operational and reconciliation cost; risk of two schema authorities. | Consider only as a separately approved platform migration program. |

The current draft implements part of Option B. It does not by itself make the historical chain valid and must remain in draft until the owner/DBA decides how fresh install and existing upgrade environments are to converge.

## Forward-fix review

Draft reviewed: `backend/migrations/drafts/20260830120000-rpjmd-indicator-unique-forward-fix.draft.js`.

| Review point | Result | Assessment |
|---|---|---|
| Active-chain isolation | `Pass` | Stored below `migrations/drafts`; not a top-level active candidate. |
| Production guard | `Pass` | Requires disposable-only mode, exact audit database, loopback host, and explicit approval flag. |
| Target scope | `Pass with limitation` | Three tables are evidence-backed; four other tables handled by the old migration need separate review. |
| Table/column guard | `Pass` | Uses `showAllTables` and `describeTable`; fails if prerequisites are absent. |
| Duplicate policy | `Pass` | Refuses to add a unique index when duplicate `kode_indikator` exists; performs no automatic deletion. |
| Idempotency | `Pass in disposable test` | Existing index is detected before add. |
| Down behavior | `Pass in disposable test` | Removes only its own indexes; does not restore deleted data because it deletes none. |
| Identifier safety | `Pass` | Static target identifiers are validated before SQL interpolation. |
| Transaction/partial failure | `Open` | Multi-table index changes are not wrapped in a proven cross-table transaction; failure injection and recovery test remain required. |
| Applied-history awareness | `Open` | Draft cannot know whether old migrations ran; owner/DBA inventory is required. |
| Fresh-chain resolution | `Open` | Old premature migration can still fail before the draft is reached. |
| Data reconciliation | `Open` | Duplicate/FK policy and authoritative-row selection are not defined. |

## Required review/rollback plan before activation

The owner/DBA must export applied migration identifiers from each nonproduction environment, map the four duplicate prefixes to intended dependencies, and decide whether fresh install uses the legacy chain plus compatibility gate or a separately approved clean baseline. The draft must then be tested against empty, representative-upgrade, duplicate-key, existing-index, missing-column, injected-failure, and restored-disposable-backup cases.

Before activation, capture a disposable schema/index snapshot. If a multi-table operation fails, restore or recreate only the disposable target and compare invariants. The forward-fix must be promoted from `drafts` to the active chain only after owner/DBA approval, independent review, and a rollback/recovery procedure are recorded. No production migration is authorized.

## Status

| Item | Status |
|---|---|
| Repository candidate inventory | `Verified` for file/hash/operation extraction |
| Applied migration authority | `Not Verifiable` |
| Duplicate-prefix resolution | `Open / Owner-DBA decision required` |
| AUD-003 draft static review | `Fixed Pending Retest` |
| AUD-003 disposable empty/representative/duplicate/idempotency/down tests | `Verified` in synthetic disposable harness |
| AUD-003 system finding | `Fixed Pending Retest / Open Release Blocker` |
| Active migration chain execution | `Not Run` |
| Production access | `Not Used` |

## References

- `audit/authoritative-migration-inventory-v5.csv`
- `audit/authoritative-migration-inventory-v5.json`
- `audit/migration-dependency-graph-v5.json`
- `audit/migration-dependency-graph-v5.mmd`
- `audit/migration-conflict-register-v5.csv`
- `audit/migration-conflict-register-v5.json`
- `audit/forward-fix-migration-draft-v5.md`
- `audit/forward-fix-draft-validation-v5.md`
- `audit/forward-fix-disposable-test-report-v5.md`
- `audit/remediation-traceability-v5.csv`
- `audit/remediation-traceability-v5.json`
