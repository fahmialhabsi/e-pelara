# IAM/RBAC Remediation — Stage 4

**Date:** 2026-08-29  
**Branch:** `remediation/epelara-esigap-audit-v3`  
**Scope:** User-management authorization controls and deterministic helper tests. Production IAM and live sessions were not accessed.

## Changes made

`backend/helpers/iamAuthorization.js` defines a single normalized role hierarchy for `PELAKSANA`, `PENGAWAS`, `ADMINISTRATOR`, and `SUPER_ADMIN`. It denies unknown roles, prevents non-super-admin actors from managing equal or higher roles, and provides fail-closed tenant matching for actor-target operations. `SUPER_ADMIN` remains the explicit tenant-wide exception.

`backend/controllers/userController.js` now validates the target role against the actor before user creation and update, derives ordinary users’ tenant from authenticated request context rather than `req.body.tenant_id`, fails closed when the tenant context is absent, scopes user listing to the actor tenant, verifies target tenant ownership on reads and updates, and prevents an actor from deleting the currently used account. The existing route-level restriction that deletion is `SUPER_ADMIN` only remains in place.

The implementation intentionally does not claim that the complete IAM lifecycle is closed. Reset-password token handling, refresh-token revocation/rotation, MFA, account lockout, SSO bootstrap, emergency access, and immutable IAM audit events require separate verified work.

## Evidence and test results

| Evidence | Result | Meaning |
|---|---|---|
| `backend/scripts/iamAuthorizationSelfTest.js` | Pass | Production helper verified role normalization, hierarchy denial, tenant match, missing-context denial, and SUPER_ADMIN exception. |
| `node --check backend/helpers/iamAuthorization.js` | Pass | Helper syntax valid. |
| `node --check backend/controllers/userController.js` | Pending final attached-repository run | Must be rerun and recorded in the final retest report. |
| Live API allow/deny matrix | Not Verifiable | No isolated DB, authenticated fixtures, or running staging API was available. |
| GitHub branch protection and required checks | Not Verifiable | Repository content cannot prove remote settings. |

The synthetic test uses only in-memory role names and numeric tenant IDs. No real user, password, token, or production record is used.

## Finding status

| Finding | Status | Reason |
|---|---|---|
| AUD-005 / AUD-2026-004 | `Fixed Pending Retest` | Actor-target hierarchy, tenant derivation, and self-protection are implemented; endpoint-level API tests and IAM audit-event verification remain outstanding. |
| AUD-014 / AUD-2026-013 | `Open` | Frontend localStorage/token and legacy token-channel behavior were not changed in this stage. |
| AUD-015 | `Open` | Development reset-link behavior still requires a separate decision and end-to-end reset test. |
| AUD-041 | `Open` | PENGAWAS financial write permissions require a full route/permission matrix and negative tests. |
| AUD-059 / AUD-085 | `Open` | Refresh revocation/rotation and account lockout are not evidenced. |

## Required next evidence

The project owner or test operator must provide a disposable database and isolated API environment with synthetic users for at least SUPER_ADMIN, ADMINISTRATOR, PENGAWAS, and PELAKSANA across two tenants. The test must cover create/list/read/update/delete, role changes, cross-tenant targets, self-targets, missing context, reset/logout/revocation, and audit-event sampling. The results must include exact commands, timestamp, fixture classification, response status, redacted logs, and independent reviewer approval.

## Rollback

Revert the stage-specific commit after preserving this report. No live IAM configuration, user data, credential, or token was changed.
