# Staging/Disposable Environment Manifest — v5

**Date:** 2026-08-30  
**Classification:** Audit-only disposable environment; no production access.  
**Verified container:** `epelara-audit-v5-mysql`  
**Verified database:** `epelara_audit_v5`  
**Verified network:** `epelara-audit-v5-net`  
**Verified loopback port:** `127.0.0.1:13317`  
**Verified volume:** `epelara-audit-v5-mysql-data`

## Requested isolated environment

| Component | Required staging/disposable value | Current evidence |
|---|---|---|
| Database | Dedicated disposable MySQL/MariaDB instance with different host, port, database, user, and password from production | `Verified`: MySQL `8.0.46`, container `epelara-audit-v5-mysql`, database `epelara_audit_v5`, user `epelara_audit`; password not printed. |
| Container runtime | Dedicated audit Docker project/network/volume | `Verified`: Docker client/server `28.3.3`, network `epelara-audit-v5-net`, volume `epelara-audit-v5-mysql-data`. |
| Application | Node.js service launched with `.env.audit` only | Node.js `v20.20.0` is available; no staging service was launched. |
| Package manager | npm with repository lockfiles | npm `10.8.2`; frontend and backend lockfiles are present. |
| Browser/PDF | Local Puppeteer/Chromium from repository dependencies | Source dependency is present; runtime health check not executed in this stage. |
| Storage | Disposable local/object-storage namespace | `Not Verifiable`; no object-storage service was configured. MySQL volume is disposable only. |
| Queue/Redis | Disposable Redis only if required by tested path | `Partially Verified`: existing Redis is not used for the audit DB; no audit-specific Redis namespace was configured. |
| SMTP/SSO | Fake/mock adapter only | No external provider or account was accessed. |
| Timezone/locale | Explicit staging value, recommended `Asia/Jakarta` and `id-ID` | Must be recorded by environment owner before integration tests. |

## Mandatory anti-production guard

Before any database or service test, the operator must verify that the resolved host, database name, port, storage namespace, and project/network name are audit-specific and do not match production configuration. Secrets must be injected only into process/environment scope, never printed or committed. The test must abort if required audit variables are absent or if an explicit production marker is detected.

## Verification result

A dedicated MySQL `8.0.46` container is running on loopback `127.0.0.1:13317`, with database `epelara_audit_v5`, user `epelara_audit`, network `epelara-audit-v5-net`, and volume `epelara-audit-v5-mysql-data`. The health ping passed. Temporary credentials were generated in process scope and were not printed or committed.

The container name, database name, network, volume, and loopback-only port are audit-specific and do not match the production identifiers known from the repository. No production endpoint, provider, credential, or data was accessed. Migration, seed, integration test, backup/restore, and API test have not yet run.

Object storage, fake SMTP, audit-specific Redis, browser/PDF health, and application API readiness remain unverified until the test harness is configured. This does not block the database-only guard but does limit the next integration scope.

## Status

`Partially Verified`: disposable MySQL and anti-production guard passed; storage, queue, browser/PDF, and application readiness remain `Not Verifiable`.
