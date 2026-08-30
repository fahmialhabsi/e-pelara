# Option C Final Owner/DBA Review Package — v5

**Date:** 2026-08-30  
**Decision requested:** Approve or reject the controlled chain gate and forward-fix activation plan.  
**Current implementation status:** Nonactive, disposable-tested, not activated.

## Current state

| Control | Status | Evidence |
|---|---|---|
| Existing migration immutability | `Verified` | No existing migration renamed, reordered, or edited. |
| Applied history outside audit disposable | `Not Verifiable` | `migration-applied-history-reconciliation-v5.*`; no owner-designated applied-history export. |
| Controlled chain gate | `Verified` for fail-closed contract | Fresh and upgrade-disposable gate both returned `BLOCK` exit 2 on duplicate/AUD-003/missing-history conditions. |
| AUD-003 forward-fix draft | `Verified` for narrow disposable behavior | `forward-fix-review-v5.md` and disposable matrix. |
| Active migration chain | `Blocked / Not Run` | Four duplicate active prefixes and premature AUD-003 remain. |
| Production | `Not Used` | No production database, storage, credential, or data accessed. |

## Disposable matrix

The exact audit disposable target passed guard and the following synthetic scenarios: empty install fail-closed, upgrade-like `SequelizeMeta` fixture, representative schema, existing-index idempotency, missing required column, duplicate key preservation, injected failure before the second index, index-only down, and disposable `mysqldump` restore. The final process exited `0`. These tests validate the draft and test harness, not the historical active chain.

## Controlled chain behavior

The gate must run before any active migration command. It checks the target mode/host/database, duplicate prefixes, known AUD-003 premature dependency, and sanitized applied history for upgrade mode. It returns explicit block codes and never silently skips or reorders a migration. It does not alter `SequelizeMeta` and does not execute migrations.

### Fresh install

The active chain remains blocked. Owner/DBA must select either a separately approved clean baseline or an explicit compatibility runner. The runner must preserve old filenames, record the decision, and fail closed when prerequisites are missing. No fresh-install migration is authorized by this package.

### Upgrade

The target must supply sanitized applied-history metadata. The gate must compare applied names with repository candidates before any forward-fix. Missing history is `Not Verifiable` and blocks; filenames are not accepted as proof that a migration is unapplied.

### AUD-003

The old premature operation remains explicitly blocked. The forward-fix draft may be promoted only after the applied-history decision, duplicate/FK data policy, full chain compatibility decision, independent review, and recovery evidence. It must never perform automatic deduplication.

## Owner/DBA decisions required

1. Approve the fresh-install strategy: clean baseline or controlled compatibility runner.
2. Provide or approve sanitized `SequelizeMeta` exports for each intended upgrade environment.
3. Approve the handling policy for each duplicate prefix and the migration runner’s response.
4. Approve the data authority/FK policy for duplicate indicator records; no row selection is currently implemented.
5. Approve the activation location and naming of the forward-fix after applied-history review.
6. Approve disposable recovery evidence and the rollback/compensation procedure for multi-table DDL.

## Activation sequence after approval

The sequence is: owner/DBA decision record; applied-history export; dependency/conflict review; disposable schema snapshot; fresh/upgrade chain strategy test; forward-fix dry-run; duplicate/missing-column/failure/recovery tests; invariant report; independent review; controlled gate pass; and only then a separately approved nonproduction activation. Production is outside this package and remains prohibited.

## Stop conditions

Stop immediately if the target is not `epelara_audit_v5` on loopback, if applied history is missing in upgrade mode, if duplicate keys exist without policy, if a migration is requested against production, if a migration file would need rename/reorder, if the gate suggests silent skip, or if failure recovery cannot restore the disposable target.

## Final status

`AUD-003`: **Fixed Pending Retest / Open Release Blocker**.  
Controlled gate: **Implemented and disposable-tested, nonactive**.  
Forward-fix: **Draft only, disposable-tested, nonactive**.  
Owner/DBA activation approval: **Pending**.

## References

- `audit/authoritative-migration-inventory-v5.md`
- `audit/migration-dependency-graph-v5.json`
- `audit/migration-conflict-register-v5.csv`
- `audit/migration-applied-history-reconciliation-v5.md`
- `audit/controlled-migration-chain-gate-v5.md`
- `audit/migration-decision-record-v5.md`
- `audit/optionc-forward-fix-rollback-plan-v5.md`
- `audit/migration-invariant-report-v5.md`
- `audit/optionc-disposable-test-matrix-v5.md`
- `audit/forward-fix-review-v5.md`
