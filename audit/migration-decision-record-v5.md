# Migration Decision Record — Option C v5

**Date:** 2026-08-30  
**Decision:** Prepare a controlled chain gate and guarded disposable forward-fix; do not activate either in the active chain yet.  
**Status:** Pending owner/DBA approval for final chain policy.

## Context

The repository has 264 active-candidate JavaScript migration files and four duplicate prefixes. The historical AUD-003 migration `20260218120000-rpjmd-indikator-kode-dedupe-unique.js` performs destructive deduplication and unique-index operations against three tables created later by `20260415110001`, `20260415110002`, and `20260415110003`. Existing environments may have applied some filenames, so rename/reorder could desynchronize migration metadata.

## Decision

Use Option C: preserve all existing migration files immutably; place a controlled gate before any active migration execution; block known duplicate-prefix and AUD-003 conditions explicitly; require sanitized applied-history evidence for upgrade environments; and use a separately guarded forward-fix draft for disposable testing. No silent skip is allowed.

## Fresh-install policy

Fresh install is blocked while duplicate prefix/AUD-003 conditions exist. A future approved implementation must choose either a new clean baseline chain for fresh installations or a compatibility runner that records explicit decisions and does not rewrite historical filenames. The current gate does not make that choice and does not execute the chain.

## Upgrade policy

Upgrade requires a sanitized `SequelizeMeta`/equivalent applied-history export for the target environment. Missing history is `Not Verifiable` and blocks execution. The repository inventory cannot be used to infer that a migration is unapplied.

## AUD-003 policy

The old premature migration is blocked explicitly. It is not silently skipped, auto-reordered, renamed, or modified. The forward-fix draft is kept nonactive until applied history, duplicate/FK policy, schema review, owner/DBA approval, rollback/recovery plan, and disposable test matrix pass.

## Alternatives rejected

Renaming/reordering old migration files is rejected by default. Automatic duplicate deletion or selecting the maximum ID is rejected without a written data-authority policy. Running the active chain against production or using production as a substitute for disposable testing is prohibited.

## Consequences

The immediate result is a fail-closed release gate and a safe path for disposable testing, but no production migration can proceed until the owner/DBA resolves the chain policy. This intentionally favors preservation of applied-history integrity over an unverified fresh-install convenience.

## Approval required

Owner/DBA must approve the authoritative applied-history source for each upgrade environment, the fresh-install strategy, the AUD-003 compatibility behavior, duplicate/FK data policy, and the rollback/restore procedure. Until approval is recorded, `AUD-003` remains `Fixed Pending Retest / Open Release Blocker`.
