# Remediation Execution Plan — e-PeLARA/e-SIGAP v5

**Date:** 2026-08-30  
**Branch:** `remediation/epelara-esigap-audit-v3`  
**Owner authorization:** Explicitly approved for Stage 0–2 and low-risk repository/staging work.  
**Safety boundary:** No production access, production migration, production backup/restore, remote settings change, external account access, production credential use, or real personal/financial data.

## Owner decisions incorporated

The initial deployment model is treated as isolated per instansi/daerah, while DPA, LK, BMD, LAKIP, Monev, Pengkeg, LPK, and SDI operational data must have explicit OPD/tenant boundaries. PENGAWAS is read-only for financial transactions and may only create supervision/recommendation/evidence/follow-up records. Migration changes must use a forward-fix strategy after authoritative inventory and disposable testing; existing migration filenames must not be renamed or reordered. Account Registry credentials are highly restricted metadata and must not reach frontend, URL, log, or API response; tenant scope remains conditional on inventory. Legacy URL-token SSO must not return; only a mocked/server-side exchange contract may be prepared.

## Stage sequence

| Stage | Scope | Dependencies | Rollback | Acceptance gate |
|---:|---|---|---|---|
| 0 | Rebaseline, tool/runtime inventory, finding register, file ownership classification | Current branch and audit baseline | Revert only stage commit; never reset user changes | HEAD/upstream captured; staged set empty before work; user changes excluded. |
| 1 | Disposable/staging environment manifest and health-check design | Docker/Node/package-lock inventory; no production endpoints | Stop/remove only disposable resources created by audit | Anti-production guard, isolated names/ports/volumes, sanitized manifest, no secrets. |
| 2 | Synthetic fixture manifest and safety checks | Stage 1 environment contract | Remove only synthetic fixtures/resources by recorded cleanup command | Two tenants/OPDs, role hierarchy, financial/document/MR fixtures, classification, no production data. |
| 3 | Tenant/OPD integration authorization | Stage 1–2; owner scope decisions | Revert stage commit; isolate disposable DB | Real route/controller/service tests for allow/deny across active domains. |
| 4 | IAM/cookie/CSRF/RBAC/SoD lifecycle | Stage 2; SSO remains mock-only | Revert stage commit; do not change external IdP | Login, `/auth/me`, refresh/logout, CSRF, reset, role denial, token leakage, socket identity. |
| 5 | Financial concurrency, idempotency, audit trail, authoritative workflow | Disposable DB and fixture data | Restore disposable snapshot or recreate disposable DB | Duplicate/race/failure/reconciliation/audit tests pass; no production command. |
| 6 | Migration authoritative inventory and forward-fix proposal | Owner-approved inventory; Stage 1 disposable DB | Forward-fix down/compensating plan; never rename applied files | Fresh/representative/failure/recovery tests pass before migration closure. |
| 7 | Dependency and supply-chain batches | Package/lockfile baseline and affected feature tests | Revert package+lockfile batch | Patch/minor/major compatibility review, tests/build/security scan, exception if needed. |
| 8 | Input/output, uploads, HTML/PDF/Word/Excel, Socket.IO, errors, logging, rate limits | Synthetic payload fixtures and disposable service | Revert stage; remove only disposable files/resources | Dangerous payload, traversal, oversize, forged socket, error redaction, rate limit tests. |
| 9 | Backup/restore, RPO/RTO, SLA, performance/capacity, operations | Disposable DB/storage and approved measurement protocol | Destroy/recreate disposable resource only | Measured evidence with limitations; no owner approval fabricated. |
| 10 | CI/CD drafts, e-SIGAP mock contract, SPBE matrix, retest, release gate | All preceding evidence | Revert report/config draft commit | Every P0 closed with required evidence or explicit owner risk acceptance. |

## Stage 0 commands

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse '@{u}'
git diff --name-only
git diff --cached --name-only
node --version
npm --version
git --version
```

No command in this plan may be pointed at production. Any database command must receive an explicit disposable connection guard and sanitized environment manifest first.

## Stage 1 environment guard

Docker may be used only with an audit-specific project/network/volume name. The database name, host, port, storage root, and credentials must be distinct from production. The health check must fail closed if an environment variable or resolved host resembles a production endpoint. Secrets may exist only in process/environment scope and must never be printed or committed.

## Evidence and status protocol

Each stage stores command, timestamp, environment classification, result, evidence path, owner, reviewer, residual risk, and rollback note. `Closed Verified` requires implementation evidence, integration/security test evidence, operational evidence where applicable, owner, and independent reviewer. Source changes, build success, helper self-test success, or a written report alone are insufficient.

Allowed statuses are `Open`, `In Progress`, `Fixed Pending Retest`, `Mitigated`, `Closed Verified`, `Not Verifiable`, `Not Applicable`, and `Conflict`. Any unresolved P0 keeps the release decision `NOT READY`.

## Explicit blockers and conflicts

The current repository contains 531 migration files while the earlier audit baseline recorded 271. The existing validator reports duplicate/non-strict prefixes. No migration rename/reorder will be made without authoritative inventory and owner review. The PENGAWAS policy and Account Registry tenant classification have owner decisions for the initial scope, but implementation changes still require schema/route inventory and disposable tests. SSO provider behavior remains mock-only.

## Commit protocol

After each completed stage, only stage-owned files may be staged:

```powershell
git add -- <stage-owned-files>
git diff --cached --name-status
git commit -m "<stage-specific message>"
git push origin remediation/epelara-esigap-audit-v3
```

A failed test must be recorded as evidence and must not be hidden by lowering thresholds, suppressing lint rules, or marking a finding closed.
