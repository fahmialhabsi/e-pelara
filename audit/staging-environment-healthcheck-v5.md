# Staging/Disposable Environment Health Check — v5

**Date:** 2026-08-30  
**Environment classification:** Dedicated disposable MySQL environment available; application/storage dependencies remain partial. Production was not accessed.  
**Container:** `epelara-audit-v5-mysql`  
**Database:** `epelara_audit_v5` on `127.0.0.1:13317`  
**Network/volume:** `epelara-audit-v5-net` / `epelara-audit-v5-mysql-data`

## Checks

| Check | Command/procedure | Result | Evidence/limitation |
|---|---|---|---|
| Docker daemon | `docker version --format 'client={{.Client.Version}} server={{.Server.Version}}'` | `Pass` | Docker client/server `28.3.3`; audit-only container is running. |
| MySQL connectivity | `docker exec epelara-audit-v5-mysql mysqladmin ping ...` | `Pass` | Health ping passed using temporary process-scoped credential; credential not printed. |
| Migration status | `npm run db:migrate:status` with audit-only env | `Not Run` | Must not run without an isolated database and guard. |
| Database seed | Audit-only seed command | `Not Run` | Must use synthetic fixtures only. |
| File storage | Disposable storage health endpoint | `Not Verifiable` | No storage endpoint configured. |
| Redis/queue | Disposable Redis health check | `Not Verifiable` | No Redis service configured. |
| Browser/PDF engine | Puppeteer launch in isolated test | `Not Run` | Requires staging/disposable test harness. |
| API readiness | Start backend with audit env and call health endpoint | `Not Run` | Requires isolated database and dependency configuration. |
| Anti-production guard | Compare container/database/network/volume/port against approved audit manifest | `Pass` | Audit-specific names, loopback-only port, temporary credentials, and no external provider. |

## Safe rerun sequence after infrastructure is available

```powershell
# 1. Set temporary audit-only variables in process scope; do not commit or print secrets.
$env:EPELARA_AUDIT_ENV = 'true'
$env:NODE_ENV = 'audit'

# 2. Verify the audit host/database/storage identifiers against the manifest.
# 3. Start only the audit/disposable services.
# 4. Run migration status, fresh migration, synthetic seed, and health checks.
Push-Location backend
npm run db:migrate:validate-chain
npm run db:migrate:status
npm run check:db-schema
Pop-Location
```

The sequence above must be stopped if the migration-chain validator fails, if any resolved endpoint resembles production, or if the environment cannot prove that its database/storage namespace is disposable.

## Current outcome

Disposable MySQL connectivity and the anti-production guard passed. Migration, seed, integration, backup/restore, and API tests have not yet run, as required by the pre-test gate. Object storage, audit-specific Redis, fake SMTP, browser/PDF runtime, and application readiness remain `Not Verifiable`; they are not being substituted with production services.

The next safe action is to commit this environment evidence, then run migration status/fresh migration only against `epelara_audit_v5` with the same guard. Seed and integration tests remain blocked until the application’s staging configuration can be injected without production values.
