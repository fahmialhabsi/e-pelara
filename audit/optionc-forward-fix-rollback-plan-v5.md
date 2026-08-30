# Option C Forward-Fix and Rollback Plan — v5

**Date:** 2026-08-30  
**Scope:** Controlled chain gate and disposable-only forward-fix.  
**Status:** Plan only; no active-chain activation and no production operation.

## Non-negotiable rules

All existing migration files remain immutable. No rename, reorder, import, silent skip, production execution, or production database query is allowed. The controlled gate must block before the active chain when duplicate prefixes, AUD-003 premature dependency, or missing upgrade applied history are detected.

The forward-fix remains under `backend/migrations/drafts/` until owner/DBA approval, authoritative applied-history reconciliation, dependency review, and all disposable tests pass. It must never be used to infer whether a historical migration ran.

## Fresh-install policy

A fresh install must use one explicitly approved strategy:

| Strategy | Behavior | Gate |
|---|---|---|
| Clean baseline | A separately versioned schema baseline is built for fresh environments; legacy upgrade chain remains separate. | Requires platform owner/DBA approval and schema equivalence/invariant report. |
| Controlled compatibility path | The runner inspects the chain, blocks known premature operations, and invokes only an explicitly approved compatibility/forward-fix sequence. | Requires a durable decision record; no silent skip and no filename rewrite. |

Until one is approved, fresh execution remains blocked by `DUPLICATE_ACTIVE_PREFIX`, `AUD-003_PREMATURE_DEDUPE`, and `FRESH_CHAIN_REQUIRES_EXPLICIT_POLICY`.

## Upgrade policy

An upgrade target must provide sanitized applied-history metadata from `SequelizeMeta` or equivalent. The gate compares history against repository candidates, identifies unknown/missing names, and stops on ambiguity. If history is unavailable, status is `Not Verifiable`; the system must not assume a migration is unapplied.

An upgrade forward-fix is appended after the authoritative applied chain, not inserted before historical files. If a target already has the old AUD-003 migration applied, the forward-fix performs schema/index/invariant checks only and does not repeat destructive deduplication.

## AUD-003 forward-fix scope

The current draft addresses unique-index readiness for `indikatorstrategis`, `indikatorarahkebijakans`, and `indikatorsubkegiatans`. It checks table and required column existence, refuses duplicate `kode_indikator`, adds a named unique index only when absent, and has an index-only down path. It does not choose authoritative duplicate rows and does not solve the old chain’s premature execution by itself.

## Failure handling

Before disposable execution, capture a disposable schema/index snapshot and record the container/database identity. During a multi-table operation, any failure must stop the operation and emit the table/index state. Do not continue to the next table after a failure. If the database engine cannot guarantee transactional DDL, use a disposable snapshot/recreate procedure rather than claiming atomic rollback.

A failure recovery test must inject failure before the second or third target operation, restore/recreate the disposable target, re-run invariant checks, and demonstrate that no unintended rows or indexes remain. No data deduplication is permitted in the failure path.

## Rollback plan

| Situation | Action | Evidence |
|---|---|---|
| Draft guard fails | Stop before SQL; correct environment/approval only. | Guard output with `BLOCK` reason. |
| Target table/column missing | Stop; do not create prerequisite tables from the forward-fix. | Error and schema inventory. |
| Duplicate business key | Stop; preserve all rows and request owner/DBA data policy. | Duplicate query result and row-count invariant. |
| Index add fails | Stop; capture index/schema state; restore disposable snapshot or remove only a confirmed draft-owned index. | Before/after index inventory and failure log. |
| Post-test cleanup | Drop only synthetic disposable objects created by the test harness. | Cleanup log and empty-target invariant. |
| Historical applied state conflict | Stop; do not rename/reorder or re-run old migration. | Applied-history reconciliation and decision record. |

The draft `down` removes only its own named indexes and cannot restore rows deleted by any historical migration. This is intentional: historical data deletion requires a separate data-recovery process and owner/DBA policy.

## Recovery and acceptance prerequisites

Before activation, provide a disposable backup/snapshot, fresh empty install result, representative upgrade result, duplicate/missing-column result, injected-failure recovery result, and invariant report before/after. Record database engine/version, migration runner version, applied history, test fixture classification, timestamps, reviewer, and rollback command. A production backup or production restore is outside this plan and prohibited.

## Approval gate

Owner/DBA approval is required for fresh-install strategy, applied-history authority, duplicate/FK policy, migration runner behavior, forward-fix activation location, and rollback/recovery procedure. Until all approvals and tests are recorded, `AUD-003` remains `Fixed Pending Retest / Open Release Blocker`.
