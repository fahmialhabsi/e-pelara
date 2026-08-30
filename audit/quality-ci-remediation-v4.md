# Quality, Dependency Visibility, and CI Gate Remediation — Stage 7

**Date:** 2026-08-30  
**Scope:** DB-independent security regression registration and CI enforcement. No dependency upgrade was performed automatically because the repository has a large dependency graph and upgrade compatibility must be tested per package.

## Implemented controls

`backend/package.json` now exposes `test:opd-boundary` and `test:iam-authorization` commands for the production helper self-tests added in earlier remediation stages.

`.github/workflows/ci-generic.yml` now runs both security regression commands in the backend job and adds a frontend production dependency audit gate using `npm audit --omit=dev --audit-level=high`. The gate is intentionally fail-closed for high/critical production dependency findings; the current known vulnerability inventory means the workflow may remain red until dependencies are upgraded and retested.

## Verification

| Check | Status | Evidence |
|---|---|---|
| `backend/package.json` JSON validity | `Verified` | Node JSON parse passed. |
| OPD boundary regression | `Verified` | `npm run test:opd-boundary` passed: allow, cross-OPD deny, missing-context deny, missing-owner fail-closed, and SUPER_ADMIN scope. |
| IAM regression | `Verified` | `npm run test:iam-authorization` passed. |
| CI workflow syntax/behavior | `Partially Verified` | YAML changes reviewed; hosted GitHub execution and branch required-check enforcement remain unverified. |
| Dependency closure | `Open` | Prior baseline reports 18 frontend and 45 backend production vulnerabilities; no blind upgrade was made. |
| Full lint closure | `Open` | Repository lint debt remains and is scheduled for domain-by-domain remediation. |

## Required acceptance tests

Run the workflow on a pull request and confirm the new tests actually execute, the dependency audit fails on a high/critical production advisory, and branch protection requires the checks. Add backend dependency audit after confirming a safe way to handle the current advisory inventory. Upgrade dependencies in small batches with lockfile review, test/build/security regression, and rollback plan.

## Residual risks

The CI file alone does not prove branch protection or deployment approval. The current audit gate is expected to expose existing vulnerabilities rather than close them. Status: `Partially Fixed`.
