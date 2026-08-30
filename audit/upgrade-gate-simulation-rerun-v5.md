# Upgrade Gate Simulation Rerun — v5

**Date:** 2026-08-30  
**Target:** `epelara-audit-v5-mysql` / `epelara_audit_v5` / `127.0.0.1:13317`.  
**Mode:** `UPGRADE_DISPOSABLE`.  
**Production access/data:** `NOT_USED`.  
**Active migration execution:** `NOT_RUN`.

## Purpose

Repeat the upgrade simulation using a sanitized `SequelizeMeta` fixture to confirm that the controlled migration chain gate reads applied-history markers, blocks unresolved duplicate-prefix and AUD-003 conflicts, and never silently skips or executes the active migration chain.

## Guard results

| Guard | Result |
|---|---|
| Exact container `epelara-audit-v5-mysql` | `PASS` |
| Image `mysql:8.0.46` | `PASS` |
| Database `epelara_audit_v5` | `PASS` |
| Loopback `127.0.0.1:13317` | `PASS` |
| Upgrade mode | `PASS` |
| Production access flag false | `PASS` |
| Credential exposure | `PASS` — process-scoped only; no value recorded |

## Simulation results

| Scenario | Result |
|---|---|
| Sanitized `SequelizeMeta` fixture loaded | `PASS` — three migration names, no credentials/application data |
| Applied-history readback | `PASS` |
| Controlled gate in upgrade mode | `BLOCK` — expected behavior |
| Duplicate-prefix conflict | `BLOCK` — not silently skipped |
| AUD-003 premature dependency | `BLOCK` — not silently skipped |
| Active migration chain | `NOT_RUN` |
| Production access/data | `NOT_USED` |

The harness exited `0` because an explicit gate block is the expected success condition for this unresolved chain. The block proves that supplied applied history does not bypass the duplicate-prefix/AUD-003 controls.

## Interpretation and limitations

This is a disposable behavior simulation, not evidence of applied history in any real nonproduction environment. It does not authorize migration activation, create an authoritative row decision, delete duplicate data, change `SequelizeMeta` outside the disposable target, or validate the full active chain.

## AUD-003 status

`Fixed Pending Retest / Open Release Blocker`. The disposable gate behavior is verified; applied-history reconciliation, owner/DBA decision, full fresh/upgrade chain strategy, and activation approval remain pending or `Not Verifiable`.
