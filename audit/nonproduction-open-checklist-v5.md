# Nonproduction Open Checklist — Option C v5

**Purpose:** Owner/DBA review before any nonproduction activation.  
**System status:** `NOT READY`.  
**AUD-003:** `Fixed Pending Retest / Open Release Blocker`.  
**Policy:** Option C is approved as control policy and remediation plan, not activation authorization.

## Guard and environment

| Item | Current status | Required closure evidence |
|---|---|---|
| Disposable MySQL container | `Verified` for audit container `epelara-audit-v5-mysql` | Preserve target identity, image, port, volume, network and owner evidence. |
| Loopback/production guard | `Verified` for `127.0.0.1:13317` | Repeat guard before every test or operation. |
| Real nonproduction upgrade environment | `Not Verifiable` | Environment owner must identify target and provide sanitized applied history. |
| Application schema in disposable DB | `Not Verifiable` for full application | Schema fingerprint after approved setup; do not use active chain until gate is approved. |
| Object storage | `Not Verifiable` | Audit-specific bucket/volume, access policy, encryption and cleanup evidence. |
| Queue/Redis | `Not Verifiable` | Audit-specific namespace, credentials scope, cleanup and health evidence. |
| Browser/PDF integration target | `Not Verifiable` | Disposable browser/PDF runtime and artifact redaction evidence. |

## Migration and applied history

| Item | Status | Required action |
|---|---|---|
| 264 active-candidate inventory | `Verified` as repository inventory | DBA review and sign-off of CSV/JSON, hashes, exclusions and active scope. |
| Four duplicate prefixes | `Open / Block` | Per-pair dependency/order decision; no rename, reorder or lexical-order assumption. |
| AUD-003 premature dependency | `Fixed Pending Retest / Open Release Blocker` | Decide fresh/upgrade handling, approve target scope, and complete full disposable chain evidence. |
| Applied history for real nonproduction upgrades | `Not Verifiable` | Sanitized `SequelizeMeta` export per environment; include hash, owner, timestamp and reviewer. |
| Missing/extra/unknown applied names | `Not Verifiable` | Exact comparison against immutable inventory; each discrepancy gets `PASS`, `BLOCK`, `CONFLICT` or `NOT_VERIFIABLE`. |
| Fresh-install policy | `Pending` | Owner/DBA choose clean baseline or explicitly governed compatibility runner. |
| Compatibility-runner behavior | `Implemented as nonactive gate/draft` | Approve manifest, no-silent-skip rule, durable decision ledger, and recovery behavior. |
| Migration applied status | `Not Verifiable` | Never infer from filename; reconcile metadata per environment. |
| Active migration execution | `Not Run` | Remains prohibited until explicit nonproduction activation approval. |

## Schema, invariant, and data authority

| Item | Status | Required action |
|---|---|---|
| Empty/missing-schema forward-fix guard | `Verified` on disposable synthetic schema | Retain fail-closed behavior and evidence. |
| Representative/upgrade-like schema | `Verified` on synthetic fixture | Real nonproduction schema fingerprint still required. |
| Existing-index/idempotency | `Verified` on disposable synthetic schema | Repeat with approved application schema. |
| Duplicate-key refusal | `Verified` on synthetic data | Preserve all raw rows; obtain data-owner authority policy. |
| Authoritative-row policy | `Draft / Pending approval` | Owner/data owner/DBA sign policy and grouping key per domain. |
| Quarantine policy | `Verified` for synthetic behavior; governance pending | Approve retention, access, release criteria and audit trail. |
| FK inventory | `Not Verifiable` for complete application scope | Map direct FK, soft references, joins, denormalized IDs, audit/history and file metadata. |
| FK reconciliation mapping | `Not Run` for real data | Require owner-approved old/new mapping, no orphan, count preservation and reversible plan. |
| Duplicate deletion | `Not Run / Prohibited by current package` | Separate written approval required; no automatic deletion. |
| Authoritative-row selection | `Not Run` | No selection by max ID, timestamp or child count without written decision. |
| Invariant report | `Partial` — synthetic disposable only | Add schema fingerprint, row count, checksum, FK, orphan, index and business invariant evidence. |

## Test and recovery gates

| Item | Status | Required closure evidence |
|---|---|---|
| Empty install | `Pass` for guarded draft behavior | Full approved fresh strategy test if clean baseline or runner is selected. |
| Representative upgrade | `Pass` for synthetic upgrade-like behavior | Approved nonproduction applied history and application schema. |
| Missing table/column | `Pass` for draft guard | Application-schema rerun and artifact log. |
| Existing index | `Pass` | Application-schema idempotency rerun. |
| Duplicate key | `Pass` | Owner-approved policy plus raw-count and quarantine evidence. |
| Injected failure | `Pass` for disposable harness | Failure matrix for each multi-step operation and recovery sign-off. |
| Disposable restore | `Pass` for synthetic metadata/schema | Snapshot hash and before/after invariant comparison. |
| Full active-chain fresh test | `Not Run` | Prohibited while controlled gate is `BLOCK`. |
| Full active-chain upgrade test | `Not Run` | Requires approved compatibility path and applied-history evidence. |
| Backup/restore operational drill | `Not Verifiable` beyond synthetic proof | DBA/operations runbook and staging/disposable drill. |

## CI/CD and governance

| Item | Status | Required action |
|---|---|---|
| Controlled gate command | `Implemented` | Make it a required blocking check before build/deploy/migration jobs. |
| P0 regression checks | `Implemented partially` | Verify required checks and route/security integration coverage. |
| Branch protection | `Not Verifiable` | Owner/repository administrator provide settings evidence. |
| Required checks/no bypass | `Not Verifiable` | Confirm admin bypass restrictions and deployment approval. |
| Independent DBA/security review | `Pending` | Named reviewer, scope, date and signed result. |
| Owner/data-owner approval | `Pending` | Signed policy/decision record; no AI or Manus signatory. |
| Residual-risk register | `Pending` | Risk owner, expiry, compensating control and escalation. |
| Change/recovery runbook | `Partial` | Add abort threshold, contacts, snapshot and restore commands. |

## Status rule

Any `BLOCK`, `Not Verifiable`, `Conflict`, or `Pending` item prevents nonproduction activation. A helper self-test or synthetic simulation does not close an application-level finding. `Closed Verified` requires implementation, integration/security test, evidence path, named owner, independent reviewer, rollback/recovery evidence, and retest timestamp.

## Current conclusion

The disposable controls are useful and bounded, but the package is not ready for active-chain execution. AUD-003 remains `Fixed Pending Retest / Open Release Blocker` and the system remains `NOT READY`.
