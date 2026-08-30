# Applied Migration History Reconciliation — v5

**Date:** 2026-08-30  
**Scope:** Local Docker metadata and explicitly disposable candidates only. No production access and no migration execution.

## Environment inventory

| Environment/container | Status | Guard result | Database/schema evidence | Applied history | Use in this task |
|---|---|---|---|---|---|
| `epelara-audit-v5-mysql` | Running | `PASS` — exact audit name, image `mysql:8.0.46`, loopback `127.0.0.1:13317`, database `epelara_audit_v5`, audit network/volume | MySQL health passed; schema was empty before synthetic test; target tables were created/removed only by disposable harness | `Not Verifiable` — `SequelizeMeta` absent in the empty database, which proves no metadata is present there but does not prove any other environment has not applied migrations | Authorized disposable target for forward-fix tests |
| `epelara-mysql-nonprod` | Running | `Not Verifiable` for this audit — container is loopback `127.0.0.1:13307` but uses the generic `bridge` network and database `epelara_nonprod`; it was not owner-designated as the v5 disposable target | Not queried because exact audit guard failed | `Not Verifiable` | Not used; no database query or migration command was run |
| `epelara-mysql-restore-test` | Exited | `Not Verifiable` — stopped container and no active disposable test authorization | Not queried | `Not Verifiable` | Not used |
| `mysql-db` | Exited | `Not Verifiable` — generic stopped container; no audit identity | Not queried | `Not Verifiable` | Not used |
| `node-backend` | Exited | Not a database container | Not applicable | Not applicable | Not used |
| `redis-server` | Running | Not a database and no audit-specific queue namespace was established | Not queried | Not applicable | Not used |

## Interpretation

The only environment that passed the explicit Option C guard is `epelara-audit-v5-mysql`. Its `epelara_audit_v5` database was empty at preflight and had no `SequelizeMeta` table before the controlled synthetic forward-fix test. The harness created only three synthetic tables, ran the draft directly, verified behavior, and removed those tables. It did not execute the active migration chain.

The absence of `SequelizeMeta` in the audit database is not evidence about the other containers or any production/staging environment. The generic `epelara-mysql-nonprod` container is treated as `Not Verifiable` because its identity, network, database classification, ownership, and applied-history evidence were not sufficient for this audit. It was not queried to avoid accidentally reading an unapproved environment.

## Required authoritative reconciliation

For each nonproduction environment that the owner/DBA intends to classify as upgrade or representative, provide a sanitized metadata export containing the database identifier, schema version, `SequelizeMeta`/equivalent migration names, migration runner version, and last restore/backup reference. The export must not contain credential values, PII, financial rows, or production data. Each environment must be explicitly labeled as `fresh`, `representative-upgrade`, `failure-recovery`, or `restore-test`.

Until that evidence is provided, every applied-history conclusion outside `epelara-audit-v5` remains `Not Verifiable`; no migration is assumed to be unapplied merely because its filename exists or a container is stopped.

## Status

`Partially Verified`: the audit disposable environment is identified and tested, but applied history for nonproduction environments other than the audit database is not verifiable. No active migration chain was run.
