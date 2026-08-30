# Authoritative Migration Inventory Summary — v5

**Scope:** Repository-only inventory. No migration module was imported or executed.

| Metric | Result |
|---|---:|
| Recursive migration files | 531 |
| Active-candidate JavaScript migration files | 264 |
| JavaScript files with standard prefix | 264 |
| JavaScript files with missing/nonstandard prefix | 0 |
| Duplicate prefixes | 4 |
| Non-strict ordering transitions | 4 |

## Duplicate prefixes

- `20260412120000`: `20260412120000-add-indikator-renstra-tahun6-lokasi-pagu.js`; `20260412120000-planning-line-item-change-log.js`
- `20260424120000`: `20260424120000-create-renja-mapping-apply-batch.js`; `20260424120000-multi-tenant-saas-core.js`
- `20260428120000`: `20260428120000-add-tahun-2025-urusan-kinerja.js`; `20260428120000-planning-audit-rka-dpa.js`
- `20260720120000`: `20260720120000-create-pejabat-penandatangan.js`; `20260720120000-widen-rka-kode-unik-sub-kegiatan.js`

## Operation risk tags

| Tag | Count |
|---|---:|
| `add_column` | 116 |
| `add_constraint` | 23 |
| `add_index` | 143 |
| `change_column` | 14 |
| `create_table` | 128 |
| `delete_or_destroy` | 1 |
| `drop_table` | 128 |
| `raw_sql` | 44 |
| `remove_column` | 115 |
| `remove_constraint` | 11 |
| `remove_index` | 41 |

## Authority and next steps

This inventory is **Not Yet Authoritative** because repository filenames do not prove which migrations ran in any environment. The owner/DBA must reconcile `SequelizeMeta` (or equivalent migration history) separately for each disposable/staging environment, map predecessor dependencies, identify destructive operations, and record whether any file was applied. Existing files must not be renamed or reordered.

The recommended forward-fix must be a new migration after the authoritative applied chain. It must include existence guards, idempotent checkpoints, duplicate/FK preconditions, transaction or compensating recovery behavior, and post-migration invariants. It must be tested only on disposable databases using empty, representative, injected-failure, and restore scenarios.

