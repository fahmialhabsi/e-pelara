# Staging/Disposable Environment Manifest — v5

**Date:** 2026-08-30  
**Classification:** Audit-only design and availability evidence; no production access.

## Requested isolated environment

| Component | Required staging/disposable value | Current evidence |
|---|---|---|
| Database | Dedicated disposable MySQL/MariaDB instance with different host, port, database, user, and password from production | `Not Verifiable`; MySQL CLI is unavailable and no database connection was attempted. |
| Container runtime | Dedicated audit Docker project/network/volume | Docker client `28.3.3` is installed, but the Docker Desktop Linux daemon is unavailable. |
| Application | Node.js service launched with `.env.audit` only | Node.js `v20.20.0` is available; no staging service was launched. |
| Package manager | npm with repository lockfiles | npm `10.8.2`; frontend and backend lockfiles are present. |
| Browser/PDF | Local Puppeteer/Chromium from repository dependencies | Source dependency is present; runtime health check not executed in this stage. |
| Storage | Disposable local/object-storage namespace | `Not Verifiable`; no storage service was configured. |
| Queue/Redis | Disposable Redis only if required by tested path | `Not Verifiable`; no Redis service was configured. |
| SMTP/SSO | Fake/mock adapter only | No external provider or account was accessed. |
| Timezone/locale | Explicit staging value, recommended `Asia/Jakarta` and `id-ID` | Must be recorded by environment owner before integration tests. |

## Mandatory anti-production guard

Before any database or service test, the operator must verify that the resolved host, database name, port, storage namespace, and project/network name are audit-specific and do not match production configuration. Secrets must be injected only into process/environment scope, never printed or committed. The test must abort if required audit variables are absent or if an explicit production marker is detected.

## Current blocker

`docker version` returned client `28.3.3` but no server because the Docker Desktop Linux engine pipe was unavailable. The machine also has no MySQL CLI. Therefore, no disposable database, migration, seed, storage, Redis, or API readiness check was run. This is an infrastructure blocker, not an authorization to use production.

## Required owner/infrastructure action

Start an isolated Docker/MySQL or provide a separate staging/disposable database and storage endpoint. Provide only sanitized host/port/database identifiers and a method for injecting temporary credentials. Do not provide production credentials. After availability, rerun the health check and record schema version, migration state, seed state, storage, Redis, browser/PDF, and API readiness.

## Status

`Not Verifiable` for live environment; `Partially Verified` for local tool inventory and safety boundary.
