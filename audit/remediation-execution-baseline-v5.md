# Remediation Execution Baseline — v5

**Date:** 2026-08-30  
**Root:** `E:\1-MyApp\React\ePeLARA`  
**Branch:** `remediation/epelara-esigap-audit-v3`  
**HEAD at preflight:** `2a873551a2873e6e41588279e237acf9471d53b4`  
**Upstream:** same commit; synchronized at preflight.

## Owner authorization and safety scope

The project owner approved Stage 0–2 and low-risk repository/staging work. Production database, production migration, production backup/restore, production credentials, external accounts/providers, DNS/firewall/IAM/storage/scheduler settings, branch protection, and remote repository settings are out of scope. No production data, personal data, real financial data, or real credentials may be used.

The owner specified isolated per-instansi/daerah deployment for the initial scope. DPA, LK, BMD, LAKIP, Monev, Pengkeg, LPK, and SDI operational data require explicit OPD/tenant boundaries. PENGAWAS is read-only for financial mutation. Migration changes must use forward-fix after authoritative inventory and disposable tests. Account Registry credentials are highly restricted and cannot reach frontend, logs, URLs, or API responses. Legacy URL-token SSO must not return; any replacement is mock/contract-only.

## Repository preflight

| Item | Result |
|---|---|
| Node.js | `v20.20.0` |
| npm | `10.8.2` |
| Git | `2.47.1.windows.1` |
| Docker command | Available; not connected to production. |
| MySQL CLI | Not available; no database command was run. |
| Frontend lockfile | Present. |
| Backend lockfile | Present. |
| `dokumenEPelara` files | 213 recursive files. |
| Audit directory files | 70 at preflight. |
| Migration inventory | 531 files found recursively; 264 top-level JavaScript migrations counted by the initial command. This discrepancy requires inventory reconciliation and is not silently resolved. |
| Working-tree entries | 197. |
| Tracked modified entries | 76. |
| Untracked entries | 121. |
| Staged entries | 0. |

## Repository scope counts

| Scope | Count |
|---|---:|
| Backend controllers | 190 |
| Backend services | 251 |
| Backend models | 238 |
| Backend routes | 162 |
| Backend middlewares | 19 |
| Backend scripts | 192 |
| Frontend source files | 826 |
| Audit files | 70 |

## User-change preservation

The preflight sample includes changes in `backend/.env.example`, MR/TLHP import, Renja/Renja Governance, signing, tenant, middleware, ProSNP model, and other application areas. These entries are treated as user-owned/pre-existing unless explicitly selected as stage-owned after review. Remediation commits must use explicit path lists; `git add .`, `git add -A`, reset, clean, stash, and destructive checkout are prohibited.

## Stage 0 output

`audit/remediation-execution-plan-v5.md`, `audit/remediation-register-v5.csv`, and `audit/remediation-register-v5.json` are generated from the approved plan and the 85-record `audit/findings.json` baseline. The register preserves prior evidence semantics: baseline `Verified`/`Likely` is converted to `status_before=Open` for closure tracking, and `status_after` starts as `Open` until new implementation, integration/security test, operational evidence, owner, reviewer, and retest evidence exist.

## Stage 0 acceptance

The branch and upstream were synchronized, no files were staged before Stage 0 changes, tool versions were captured, the user-change boundary was recorded, and the new register contains 85 records. No production or external-system command was executed.
