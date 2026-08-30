# DB Preflight and Migration-Chain Report — v5

**Date:** 2026-08-30  
**Branch:** `remediation/epelara-esigap-audit-v3`  
**Target classification:** Disposable audit database only.  
**Target:** container `epelara-audit-v5-mysql`, MySQL `8.0.46`, database `epelara_audit_v5`, loopback `127.0.0.1:13317`, network `epelara-audit-v5-net`, volume `epelara-audit-v5-mysql-data`.

## Commands executed

Only the following read/preflight operations were run:

```powershell
docker version --format 'client={{.Client.Version}} server={{.Server.Version}}'
docker inspect epelara-audit-v5-mysql
docker exec epelara-audit-v5-mysql mysqladmin ping -h 127.0.0.1 -u <audit-user> --silent
npm --prefix backend run db:migrate:validate-chain
docker exec epelara-audit-v5-mysql mysql -uroot -N -B -e "SELECT VERSION(); SELECT COUNT(*) FROM information_schema.tables ..."
```

The password was process-scoped and never printed or written to the repository. No production endpoint, credential, storage, data, migration, seed, backup, restore, integration test, or API test was used.

## Anti-production guard

| Guard | Result | Evidence |
|---|---|---|
| Exact container name | `PASS` | `epelara-audit-v5-mysql`. Unknown containers were not reused. |
| Image | `PASS` | `mysql:8.0.46`. |
| Database name | `PASS` | `epelara_audit_v5`; audit-specific. |
| Network | `PASS` | `epelara-audit-v5-net`. |
| Volume | `PASS` | `epelara-audit-v5-mysql-data:/var/lib/mysql`. |
| Host/port | `PASS` | Loopback-only `127.0.0.1:13317`. |
| Credential handling | `PASS` | Temporary credential used through process/container environment and not printed. |
| External services | `PASS` | No external provider/account accessed. |

## Database status/schema preflight

The MySQL health ping passed. The database status query completed with exit code 0. The selected audit database reported MySQL version `8.0.46`, an audit container hostname, and an empty schema with `0` application tables and `0` migration metadata tables. This is consistent with a newly created disposable database and is not evidence about production schema state.

## Migration-chain validation

`npm --prefix backend run db:migrate:validate-chain` exited with code `1`. The validator was not disabled and no migration was forced. It identified these exact duplicate prefixes and non-strict transitions:

| Prefix | Conflicting files | Risk |
|---|---|---|
| `20260412120000` | `20260412120000-add-indikator-renstra-tahun6-lokasi-pagu.js`; `20260412120000-planning-line-item-change-log.js` | Lexical execution order is filename-dependent; dependency assumptions may differ between fresh and upgraded environments. |
| `20260424120000` | `20260424120000-create-renja-mapping-apply-batch.js`; `20260424120000-multi-tenant-saas-core.js` | Renja mapping and multi-tenant core ordering is ambiguous. |
| `20260428120000` | `20260428120000-add-tahun-2025-urusan-kinerja.js`; `20260428120000-planning-audit-rka-dpa.js` | Schema/audit dependency order is ambiguous. |
| `20260720120000` | `20260720120000-create-pejabat-penandatangan.js`; `20260720120000-widen-rka-kode-unik-sub-kegiatan.js` | Signing metadata and RKA uniqueness order is ambiguous. |

The validator also reports non-strict ordering transitions for each duplicate group. The repository inventory contains 531 migration-path files recursively while the top-level JavaScript migration command found 264 files; this count discrepancy must be reconciled before claiming the authoritative chain.

The earlier baseline finding `AUD-003` additionally documents a dependency risk where `20260218120000-rpjmd-indikator-kode-dedupe-unique.js` operates on indicator tables later created by `20260415110001`, `20260415110002`, and `20260415110003`. That dependency has not been executed or altered in this preflight.

## Forward-fix recommendation

Do not rename or reorder migrations that may already have run. The preferred remediation is a new forward-fix migration after the authoritative existing chain, with explicit idempotent guards and a dependency manifest. The forward-fix should:

1. create or verify required tables/columns before any delete, alter, index, FK, or backfill operation;
2. use explicit `queryInterface.describeTable`/existence checks and fail closed when assumptions do not hold;
3. record a deterministic checkpoint/manifest so rerun behavior is idempotent;
4. preserve and reconcile FK references before any deduplication or delete;
5. use transactions where supported and provide a compensating/recovery procedure where DDL cannot be fully transactional;
6. add unique/index constraints only after duplicate assessment and owner-approved data policy;
7. emit a post-migration invariant report for orphan references, expected tables, indexes, and authoritative status reconciliation;
8. be tested on an empty database, a representative upgraded disposable database, injected mid-migration failure, and restored disposable backup.

A migration owner/DBA must first produce an authoritative inventory mapping every migration file to its expected predecessor, tables created/altered, destructive operations, and whether it may have run in any environment. No production migration is authorized by this report.

## Gate decision

| Gate | Status |
|---|---|
| Anti-production guard | `Pass` |
| Disposable DB reachable | `Pass` |
| Application schema present | `Not Yet — empty disposable DB` |
| Migration chain valid | `Fail — validator exit 1` |
| Migration execution | `Not Run` |
| Seed | `Not Run` |
| Integration/API test | `Not Run` |
| Backup/restore | `Not Run` |
| Permission to proceed to migration/seed/integration | `Blocked pending owner-approved Stage 3 instruction` |

The preflight gate is therefore **CONDITIONALLY SAFE FOR FURTHER DISPOSABLE SETUP ONLY**, not safe for migration execution. Stage 3 cross-tenant integration tests may proceed only after the owner explicitly authorizes them with the migration decision above: either tests against the empty fixture-compatible schema without application migration, or a separately approved disposable-only forward-fix test sequence.
