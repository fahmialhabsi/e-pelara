# Remediation Roadmap v3

## P0 — release blockers

Stabilize server-derived tenant/OPD ownership across every active model, query, child controller, export, download, socket room, cache key, and background job. Complete endpoint-level cross-tenant negative tests against production controllers and an isolated database. Finish IAM role hierarchy, PENGAWAS separation of duties, reset/logout/revocation, emergency access, audit events, and owner approval. Complete journal concurrency, idempotency, row-lock/unique-constraint, rollback, and reconciliation tests. Replace duplicated authoritative-status logic with one production resolver and test real migrations against fresh and representative disposable databases. Do not run any of these migrations in production during this task.

## P1 — material risk reduction

Patch reachable dependency vulnerabilities with lockfile review, SBOM/provenance, exception expiry, and CI thresholds. Harden file/object storage, Socket.IO, HTML/PDF rendering, token channels, safe error envelopes, audit trails, pagination, and rate limits. Make CI execute real security, authorization, migration, and regression tests. Assign code owners and document branch protection/required checks.

## P2 — operational proof

Complete backup/restore drill with row-count, checksum, and business-invariant validation. Establish immutable/offsite retention, scheduler alert evidence, RPO/RTO by service tier, capacity/load/concurrency measurements, SLO/SLA, incident response, monitoring, and on-call. Validate records retention, accessibility, digital-signature verification, publication classification, and PPID review.

## P3 — hardening and housekeeping

Reduce lint debt with bounded baselines and expiry, remove debug/temp artifacts, improve type safety and API contract documentation, add mutation/non-vacuous test checks, and reconcile all remaining informational and low findings.

## Exit criteria

No release blocker is `Open`, `In Progress`, `Fixed Pending Retest`, or `Not Verifiable` without formal residual-risk approval. Each closure must include root cause, changed files/commit, test command/result, evidence path, owner, independent reviewer, residual risk, date, and rollback/recovery note. The project owner must sign the go/no-go decision.
