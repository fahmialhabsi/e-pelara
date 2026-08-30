# Migration, Backup, and Recovery Runbook — Stage 8

**Date:** 2026-08-30  
**Status:** Repository remediation and operational control definition; no production database or backup command was executed.

## Pre-deployment migration gate

Run `npm run db:migrate:validate-chain` from `backend` against the exact release tree. The validator checks that JavaScript migration filenames have date/sequence prefixes, that prefixes are unique, and that the sorted chain is strictly increasing. The current repository run fails because several migrations share the same timestamp prefix and some later migrations sort before earlier names. This is a release blocker until the migration owner supplies an authoritative ordering or corrects the migration chain in a separately reviewed change.

Never run `db:migrate` against production from a developer workstation. A deployment job must snapshot the database, record the migration status, run migrations with a bounded lock/timeout policy, verify schema invariants, and retain a rollback or forward-fix plan. The migration job must fail closed when the chain validator fails.

## Backup and restore gate

A production backup is acceptable only when the backup is encrypted, access-controlled, retained according to policy, independently stored, integrity-checked, and linked to a timestamped release. Restore verification must run in an isolated environment, not on the production database. The verification record must include source backup identifier, schema/application version, checksum, restore duration, row-count/invariant checks, and reviewer approval without including credentials or personal data.

The owner must define and approve RPO, RTO, retention, immutable-copy requirements, key ownership, incident escalation, and the last successful restore drill. Until those values and evidence exist, backup/recovery remains `Not Verifiable` and cannot be a production-readiness claim.

## Operational acceptance criteria

| Control | Required evidence | Current status |
|---|---|---|
| Migration chain | Validator output for the exact release tree and authoritative ordering decision | `Open — current validator fails` |
| Pre-migration backup | Encrypted backup ID, checksum, timestamp, retention class, and access log | `Not Verifiable` |
| Restore drill | Isolated restore log, invariant checks, elapsed time, and reviewer | `Not Verifiable` |
| RPO/RTO | Approved numeric targets per service tier | `Not Verifiable` |
| Rollback/forward fix | Tested procedure and owner | `Not Verifiable` |
| Production approval | Change ticket, approver, deployment window, and monitoring plan | `Not Verifiable` |

## Safety boundary

This runbook deliberately does not automate production backup, restore, migration, deletion, or data modification. Such actions require an approved operational window and a disposable/staging validation path.
