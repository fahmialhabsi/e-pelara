# Controlled Migration Chain Gate — Option C v5

**Date:** 2026-08-30  
**Status:** Draft control implemented and tested statically; active migration execution remains disabled.  
**Production access:** None.

## Purpose

The controlled gate prevents the active Sequelize migration chain from running when the repository contains duplicate active prefixes, the known AUD-003 premature operation, or missing applied-history evidence for an upgrade environment. It does not rename, reorder, import, or silently skip any existing migration. It returns a machine-readable `BLOCK` decision and requires an explicit owner/DBA-approved compatibility or forward-fix plan before any active execution can be considered.

Implementation: `backend/scripts/controlledMigrationChainGate.js`  
Command: `npm --prefix backend run db:migrate:controlled-gate`

## Required environment guard

| Variable | Required value |
|---|---|
| `EPELARA_MIGRATION_MODE` | `FRESH_DISPOSABLE` or `UPGRADE_DISPOSABLE` |
| `EPELARA_MIGRATION_HOST` | `127.0.0.1` |
| `EPELARA_MIGRATION_DATABASE` | `epelara_audit_v5` |
| `EPELARA_PRODUCTION_ACCESS` | Anything other than `true` |
| `EPELARA_APPLIED_HISTORY_FILE` | Required for upgrade mode; sanitized JSON array of applied migration names. |

A mismatched host/database/mode or explicit production marker causes immediate failure before migration inspection/execution.

## Gate decisions

| Decision code | Condition | Result |
|---|---|---|
| `DUPLICATE_ACTIVE_PREFIX` | Any duplicate prefix among 264 active-candidate files | `BLOCK`; do not choose lexical order silently. |
| `AUD-003_PREMATURE_DEDUPE` | Active chain includes `20260218120000-rpjmd-indikator-kode-dedupe-unique.js` with later table creators | `BLOCK`; old migration is not skipped silently; use approved compatibility/forward-fix policy. |
| `APPLIED_HISTORY_NOT_VERIFIABLE` | Upgrade mode has no sanitized applied-history file | `BLOCK`; filenames do not prove applied state. |
| `FRESH_CHAIN_REQUIRES_EXPLICIT_POLICY` | Fresh mode sees known chain conflicts | `BLOCK`; use approved clean baseline or controlled compatibility policy. |

## Fresh-install policy

A fresh disposable install must not run the active chain while duplicate prefixes or the AUD-003 premature operation remain unresolved. The approved choices are a separately versioned clean baseline for fresh installs, or a controlled compatibility runner that is explicitly reviewed and emits a durable decision record. Neither choice is implemented or activated by this stage.

The current empty `epelara_audit_v5` database is not used to infer that the active chain is safe. It is a disposable test target only.

## Upgrade policy

An upgrade disposable environment must provide an applied-history file exported from `SequelizeMeta` or the equivalent migration metadata table, with secrets and data removed. The gate must compare applied names to the repository candidates, detect missing/unknown history, and stop on ambiguity. An upgrade environment must never use repository lexical order as a substitute for applied history.

## AUD-003 handling policy

The old premature migration is explicitly **blocked**, not silently skipped. The current guarded forward-fix is a nonactive candidate under `backend/migrations/drafts/`; it may only be promoted after owner/DBA review, duplicate/FK policy, applied-history reconciliation, and fresh/upgrade/failure/recovery tests. If the old migration has already run in an environment, the forward-fix must not re-deduplicate data; it should verify existing schema/index state and reconcile only under approved policy.

## Test evidence

With `EPELARA_MIGRATION_MODE=FRESH_DISPOSABLE`, the gate returned exit code `2` and `BLOCK` because duplicate prefixes and AUD-003 were present. With `EPELARA_MIGRATION_MODE=UPGRADE_DISPOSABLE` and no applied-history file, the gate returned exit code `2` and `BLOCK` because duplicate prefixes, AUD-003, and missing history were present. No migration function was imported or executed.

## Status

`Verified` for fail-closed gate contract and no-silent-skip behavior. `Not Verifiable` for applied history outside the audit disposable database. `Open` for owner/DBA policy selection and active-chain resolution.
