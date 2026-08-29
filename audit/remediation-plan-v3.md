# Remediation Plan v3

**Project:** e-PeLARA/e-SIGAP  
**Branch:** `remediation/epelara-esigap-audit-v3`  
**Plan date:** 2026-08-29  
**Initial status:** `NOT READY`  
**Execution mode:** Read-only with respect to production; repository changes are limited to verified remediation work and evidence artifacts.

## Governing constraints

The remediation follows the project audit instructions and the owner constraints supplied with this task. The initial deployment assumption is isolated deployment/database per institution or region, not shared multi-region tenancy. Tenant/OPD scope must be derived from authenticated server-side identity and parent ownership. The Secretariat is a coordination and accountability hub, not an unrestricted owner of technical or financial data. PENGAWAS must not mutate financial transactions. Reversible credentials are not a normal feature. Production schema, data, IAM, or deployment changes require validated backup, approval, recovery planning, and isolated testing.

No production migration, destructive SQL, aggressive penetration test, public deployment, DNS/firewall change, secret rotation, or irreversible external operation is permitted. Tests must use disposable or staging infrastructure and synthetic/reduced fixtures. If the required environment or evidence is unavailable, the result is `Not Verifiable`, not a fabricated pass.

## Ordered workstreams and gates

| Stage | Workstream | Primary output | Exit gate |
|---|---|---|---|
| 0 | Preflight, baseline, and traceability | Baseline, plan, finding traceability | Branch/state recorded; existing changes preserved; all baseline IDs mapped |
| 1 | Tenant/OPD isolation and object authorization | Ownership/scope matrix, boundary changes, negative tests | Cross-OPD list/read/write/delete/export denied; missing context fails closed |
| 2 | IAM, RBAC, and separation of duties | Role/permission/scope/SoD matrices, auth changes, tests | Role hierarchy, PENGAWAS restriction, token handling, reset/logout/revocation verified |
| 3 | Financial atomicity and authoritative status | Transaction/status changes, concurrency and reconciliation evidence | Exactly-once/idempotent posting behavior; no double apply/void; status bypass denied |
| 4 | Migration, database, and recovery safety | Migration classification, preflight/dry-run/checkpoint controls | Fresh and representative upgrade tests pass in disposable DB; failure recovery evidence exists |
| 5 | Secrets, file, realtime, and rendering security | Secret/file/socket/XSS controls and regression tests | No secret leakage; object authorization, socket identity, and rendering sanitization verified |
| 6 | Dependency and supply chain | Audit before/after, lockfile/SBOM/exception evidence | Fixes or compensating controls documented; approved CI vulnerability threshold exists |
| 7 | Code quality, tests, and CI/CD | Quality/test/CI reports and workflow changes | Lint/type/test/security/migration gates are real, non-vacuous, and enforceable |
| 8 | API, error handling, logging, and observability | API/error/audit/operational standards | Bounded schemas/pagination, safe errors, correlation IDs, audit events, and runbook evidence |
| 9 | Backup, restore, DR, SLA, and capacity | Restore drill and performance/capacity reports | Restore and business invariant validation; measured RPO/RTO/concurrency or explicit blockers |
| 10 | e-SIGAP integration and business workflow | Integration control report | Contract, ownership, auth, idempotency, failure path, and audit trail verified or marked Not Verifiable |
| 11 | SPBE evidence remediation and release readiness | Updated SPBE matrix, full retest, release report | Every release blocker is `Closed Verified` or has formal residual-risk approval; otherwise `NOT READY` |

## Dependency order

Tenant/OPD ownership must precede broad authorization tests because test fixtures and scope derivation depend on a stable boundary model. IAM and separation of duties depend on the authenticated principal and role hierarchy. Financial atomicity and workflow status depend on authorization and transaction boundaries. Migration/recovery work must be isolated from production and depends on an accurate migration inventory. File, socket, rendering, and API controls depend on identity and error-envelope conventions. CI gates should be wired only after the underlying tests are real and reproducible. SPBE evidence and release readiness are last because they must reflect verified implementation, test, and operational evidence rather than design intent.

## Change and evidence protocol

Each workstream must record the finding IDs, root cause, affected files, exact change, migration/schema impact, test command, timestamp, environment, fixture classification, result, artifact path, reviewer, rollback/recovery note, and residual risk. A finding may be `Closed Verified` only when the stated acceptance criteria are met and a reviewer independent of the change confirms the evidence. Documentation alone cannot raise an implementation or operational status.

Repository changes will be committed in narrow, named commits. Because the baseline working tree already contains user changes, each commit must stage only the files created or intentionally changed for the current workstream. The required sequence after every completed stage is `git add` of the stage-owned paths, `git commit`, then `git push` to the remediation branch. A push failure is recorded as a blocker and must not be bypassed with force push.

## Rollback and recovery approach

For code-only changes, rollback is by reverting the specific remediation commit after preserving evidence and confirming no unrelated files were included. For schema or migration changes, no production execution is allowed in this task; the safe path is disposable-database rehearsal, preflight manifest/checksum, checkpoint or transaction strategy, restore drill, and owner approval before production consideration. For dependency changes, retain lockfile diff and run regression tests before considering a revert. For operational controls, preserve current configuration and runbooks; do not rotate or delete live credentials or backups.

## Known baseline blockers to re-verify

The previous audit reported 85 findings, including Critical risks in tenant/OPD isolation, administrator role takeover, financial posting races, migration ordering, authoritative workflow status, dependency vulnerabilities, and missing automated security gates. It also reported High risks involving token storage/leakage, Socket.IO identity trust, missing tenant columns, raw database errors, audit trails, stored XSS, and incomplete object authorization. These are not considered closed by the existence of this plan. Current status must be recomputed from the branch and fresh evidence.

A key scope conflict remains: the prior report cites 271 migrations while the current repository inventory found 531 migration files. The migration chain and active/generated classification must be reconciled before migration safety status is assessed. The prior report also used a different baseline HEAD than the current checkout; this is recorded as evidence provenance, not silently normalized.

## Initial acceptance state

Stage 0 is accepted only for preparation. No source-code finding is closed. The final release status is prohibited from being `READY` unless all specified release gates pass and the project owner accepts the residual-risk summary. Missing production topology, branch protection, scheduler, storage, monitoring, restore, RPO/RTO, SLA, capacity, and owner approvals remain `Not Verifiable` until evidence is supplied.

## References

1. [`remediation-baseline-v3.md`](remediation-baseline-v3.md)
2. [`system-audit-report.md`](system-audit-report.md)
3. [`findings.json`](findings.json)
4. [Perpres 95/2018, official JDIH source to be verified in the SPBE workstream](https://peraturan.bpk.go.id/Details/96913/perpres-no-95-tahun-2018)
5. [Perpres 132/2022, official JDIH source to be verified in the SPBE workstream](https://peraturan.bpk.go.id/Details/231223/perpres-no-132-tahun-2022)
