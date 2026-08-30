# Synthetic Fixture Manifest — v5

**Date:** 2026-08-30  
**Environment:** In-memory/module-level synthetic fixtures only; no database seed was executed because Docker/MySQL staging is unavailable.  
**Source:** `backend/fixtures/auditSyntheticFixtures.js`

## Fixture partitions

| Fixture group | Count | Ownership/safety |
|---|---:|---|
| Tenants | 2 | IDs 101 and 202; synthetic codes only. |
| OPDs | 2 | A1 belongs to tenant 101; B1 belongs to tenant 202. |
| Users | 10 | Includes SUPER_ADMIN, Tenant/OPD A/B administrators, PENGAWAS, PELAKSANA, missing-tenant, inactive/offboarded, and target-role hierarchy cases. |
| Business domains | 19 | RPJMD, RKPD, Renja, Renstra, RKA/DPA, journal/saldo/BKU, MR/TLHP, documents, and e-SIGAP command. |
| Business records | 8 | DPA, journal, MR finding, and official-document records split across both tenant/OPD partitions. |
| Account Registry records | 2 | Tenant-scoped synthetic metadata with a nonfunctional dummy marker only. |
| Security payloads | 4 | HTML/script-like, traversal, SVG, and dangerous URL strings for negative tests. |

## Role and ownership matrix

| Principal | Tenant | OPD | Intended use |
|---|---:|---:|---|
| SUPER_ADMIN | 101 | 1101 | Explicit tenant-switch exception only where policy permits. |
| ADMINISTRATOR A | 101 | 1101 | Tenant/OPD A operations; no target role escalation. |
| ADMINISTRATOR B | 202 | 2201 | Tenant/OPD B operations; no access to A. |
| PENGAWAS A | 101 | 1101 | Oversight/read-only financial access; supervision records only. |
| PELAKSANA A | 101 | 1101 | Lowest permitted operational scope. |
| Missing-tenant user | null | null | Must fail closed. |
| Inactive user | 101 | 1101 | Must be rejected/offboarded. |
| Administrator target cases | 101 | 1101 | Higher/equal/lower role hierarchy test targets. |

## Data classification

Synthetic records use `public` only for reference payloads, `internal` for DPA, `restricted` for journals and MR findings, and `confidential` for official document metadata. No real PII, financial transaction, document, credential, token, API key, private key, or connection string is included.

## Seed and cleanup

There is intentionally no database seed command in this stage. The module is imported into self-tests and held in memory. A future database seed must run only against a disposable database after the anti-production guard passes. Cleanup is process termination or recreation of the disposable database; no production cleanup command is permitted.

## Acceptance status

The fixture module covers the minimum Stage 2 identity, tenant, OPD, role, inactive/missing-context, business-domain, classification, document, and negative-payload cases. Database persistence, FK behavior, storage objects, Socket.IO rooms, queues, and real route integration remain `Not Verifiable` until staging/disposable infrastructure is available.
