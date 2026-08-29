# Cross-Cutting Technical Audit — Stage 6

**Date:** 2026-08-30  
**Branch:** `remediation/epelara-esigap-audit-v3`  
**Environment:** Attached Windows repository; repository-only commands; no production access.

## Test and quality evidence

| Command or evidence | Result | Assessment |
|---|---|---|
| `frontend/npm run test` | 237/237 tests passed across 23 files; duration about 52.8 seconds | Positive DB-independent frontend evidence, but it does not cover tenant, IAM, financial concurrency, migration, backup/restore, socket, or XSS release blockers. |
| `frontend/npm run lint` | Failed; 1,414 problems: 940 errors and 474 warnings | Quality gate is failing. |
| `backend/npm run lint` | Failed; 2,956 problems: 1,257 errors and 1,699 warnings | Quality gate is failing. The count differs from the previous baseline and must be tracked, not silently treated as improvement. |
| `backend/npm audit --omit=dev --json` | 45 vulnerabilities: 6 critical, 29 high, 10 moderate | Production dependency risk remains open. |
| `frontend/npm audit --omit=dev --json` | 18 vulnerabilities: 2 critical, 11 high, 5 moderate | Production dependency risk remains open. |
| `.github/workflows/ci-generic.yml` | Runs lint/build and selected DB-independent tests; does not run the new tenant/IAM/financial/migration/security suite | CI coverage is partial; branch protection remains Not Verifiable. |

The commands were executed on 2026-08-30 in the attached repository. npm audit JSON outputs were captured in a temporary operating-system directory and were not copied into the repository because they contain dependency metadata rather than a finalized reviewed SBOM. No install, migration, server startup, or data mutation was performed during this stage.

## Security and data-leakage status

The baseline static findings remain relevant for legacy token channels, reset-token development responses, raw error patterns, public uploads, Socket.IO identity handling, stored HTML rendering, dependency advisories, and incomplete tenant/model coverage. The stage-3 and stage-4 changes reduce selected Penatausahaan/MR read and user-management risks, but they do not establish system-wide closure. No claim of secure, compliant, or production-ready status is made.

## Recovery, performance, and operations

Backup/restore scripts and a runbook exist in the repository, but production scheduler execution, immutable/offsite storage, encryption/key custody, retention, restore drill, row-count/invariant comparison, RPO/RTO, SLO/SLA, capacity, alerting, on-call, and incident evidence remain `Not Verifiable`. No load test or concurrency test against an isolated database was run. No migration was executed.

## Regulatory evidence

The official source notes in `audit/spbe-regulatory-source-notes-v3.md` verify that Perpres 95/2018 and Perpres 132/2022 are listed as `Berlaku` on accessed government legal pages. Pedoman Menteri PANRB No. 3/2024 is listed as `Berlaku` and explicitly revokes Pedoman Menteri PANRB No. 6/2023; the latter is listed as `Tidak Berlaku`/`dicabut`. These catalogue/status observations support the regulatory baseline only. Article-level applicability, local-government policy, and implementation evidence remain to be verified.

## Stage-6 finding status

| Area | Status | Reason |
|---|---|---|
| Dependency risk | `Open` | Critical/high advisories remain; patch reachability and lockfile changes were not performed in this stage. |
| Lint and quality gates | `Open` | Both backend and frontend lint commands fail. |
| Automated test coverage | `Partially Verified` | Frontend suite passes, but critical backend/security/DB workflows are not covered by the executed suite. |
| CI/CD enforcement | `Not Verifiable` | Workflow content is visible, but branch protection, required checks, reviewer rules, and deployment controls are remote settings. |
| Backup/restore/DR | `Not Verifiable` | No isolated restore drill or owner validation was available. |
| Performance/capacity | `Not Verifiable` | No representative load/concurrency environment or signed capacity evidence was available. |
| SPBE mapping | `Partially Verified` | Current official source statuses were recorded, but control implementation/test/operational evidence is incomplete. |

## Limitations

The repository contains a large pre-existing working tree with user changes. Stage-specific commits intentionally exclude those unrelated paths. Static scans, passing unit tests, and dependency counts do not prove production security, operational resilience, or SPBE compliance. Missing evidence is recorded as `Not Verifiable` rather than inferred as pass.
