# Forward-Fix Migration Draft — v5

**Date:** 2026-08-30  
**Draft path:** `backend/migrations/drafts/20260830120000-rpjmd-indicator-unique-forward-fix.draft.js`  
**Status:** `Draft / Not Approved / Not Executed`  
**Target:** Disposable database only; never production.

## Purpose

This draft addresses the dependency and uniqueness portion of `AUD-003` without renaming or reordering an existing migration and without deleting data. The affected tables are `indikatorstrategis`, `indikatorarahkebijakans`, and `indikatorsubkegiatans`, which are created by migrations `20260415110001`, `20260415110002`, and `20260415110003`. The earlier migration `20260218120000-rpjmd-indikator-kode-dedupe-unique.js` references these tables before those creation migrations in filename order, so executing the old chain unchanged is not an acceptable closure strategy.

The draft is placed under `backend/migrations/drafts/` and is intentionally not part of the active Sequelize migration directory. It must not be copied into the active chain until the owner/DBA signs off the authoritative applied-history inventory and the test matrix passes.

## Guard and safety behavior

The draft requires all of the following process variables:

| Variable | Required value | Purpose |
|---|---|---|
| `EPELARA_FORWARD_FIX_MODE` | `DISPOSABLE_ONLY` | Prevents accidental generic execution. |
| `EPELARA_AUDIT_DATABASE` | `epelara_audit_v5` | Binds the draft to the named audit database. |
| `EPELARA_AUDIT_HOST` | `127.0.0.1` | Binds the draft to loopback disposable host. |
| `EPELARA_FORWARD_FIX_APPROVED` | `true` | Requires explicit owner/DBA approval after review. |

The guard runs before any schema operation. The draft then verifies each target table, required `id`/`kode_indikator` columns, duplicate business keys, and existing index state. It fails closed when a target table is absent, required columns are absent, duplicate keys exist, or the approval/environment guard is missing. It adds a unique index only when no duplicate exists and the index is absent. Re-running is idempotent.

The draft deliberately contains no `DELETE`, `destroy`, `dropTable`, or automatic deduplication. Existing duplicate data must be handled under a separately approved data-retention policy and reconciliation procedure; this draft refuses to guess which row is authoritative.

## Dependency evidence

| Dependency | Evidence |
|---|---|
| Target table creation | `backend/migrations/20260415110001-create-indikatorstrategis.js:4-5`, `20260415110002-create-indikatorarahkebijakans.js:4-5`, and `20260415110003-create-indikatorsubkegiatans.js:4-5`. |
| Target required columns | Each creation migration defines `id` and `kode_indikator` as non-null fields. |
| Existing premature operation | `backend/migrations/20260218120000-rpjmd-indikator-kode-dedupe-unique.js:23-43` deletes duplicate rows and adds unique keys before the later table creation files. |
| Current chain conflicts | Four duplicate active prefixes remain: `20260412120000`, `20260424120000`, `20260428120000`, and `20260720120000`. |
| Applied-history authority | Not available from repository filenames; a per-environment `SequelizeMeta` inventory is still required. |

## Required test matrix before activation

| Scenario | Expected result | Status |
|---|---|---|
| Draft loaded with no execution guard | Fail closed before SQL. | Self-test covers guard contract. |
| Empty disposable database | Fail closed if target tables are absent; do not create unrelated tables. | Not Run. |
| Representative disposable database with target tables and no duplicates | Add three unique indexes and complete successfully. | Not Run. |
| Representative database with duplicate keys | Fail before index changes; no rows deleted. | Not Run. |
| Existing forward-fix indexes | No duplicate index; rerun is idempotent. | Not Run. |
| Missing required column | Fail closed with table/column diagnostic. | Not Run. |
| Injected failure between targets | Verify transaction/compensation policy and partial state. | Not Run. |
| Backup restore followed by forward-fix | Restore and invariant report pass. | Not Run. |
| Upgrade path with applied history | No old migration rename/reorder; forward-fix is appended after authoritative history. | Not Run. |

## Rollback and recovery

The draft’s `down` removes only the indexes created by this draft and never reconstructs or deletes data. Before any disposable execution, capture a disposable backup or snapshot, record the schema/index inventory, and define the compensation procedure for engines where DDL is not fully transactional. No production rollback or backup command is permitted.

## Approval gate

The draft is not an active migration and remains `Not Approved`. Activation requires owner/DBA approval of the authoritative applied-history inventory, table/key duplicate policy, migration filename placement after the applied chain, and the four-environment disposable test matrix. Until then, `AUD-003` remains `Open / Release Blocker` and no status change is justified.
