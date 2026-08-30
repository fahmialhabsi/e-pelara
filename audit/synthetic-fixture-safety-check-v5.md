# Synthetic Fixture Safety Check — v5

**Date:** 2026-08-30  
**Environment:** In-memory synthetic module; no database, storage, queue, external provider, or production system accessed.

## Safety assertions

| Assertion | Result | Evidence |
|---|---|---|
| Exactly two synthetic tenants exist | `Pass` | `backend/fixtures/auditSyntheticFixtures.js`; IDs 101 and 202. |
| OPD ownership maps to valid synthetic tenants | `Pass` | Fixture self-test validates each OPD tenant reference. |
| Business records map to valid synthetic tenant and OPD | `Pass` | Fixture self-test validates record references. |
| Missing-tenant principal is present | `Pass` | User 10006 has null tenant/OPD and must fail closed. |
| Inactive/offboarded principal is present | `Pass` | User 10007 is inactive. |
| PENGAWAS financial read-only scenario is represented | `Pass` | User 10004 has role PENGAWAS. Route-level enforcement remains to be tested. |
| Higher/equal/lower target role scenarios are represented | `Pass` | Users 10008–10010 carry target-role cases. |
| Dummy Account Registry secret is nonfunctional | `Pass` | Marker is `AUDIT_ONLY_DUMMY_NOT_A_REAL_CREDENTIAL`; no token or provider credential. |
| HTML, SVG, traversal, and dangerous URL payloads are present | `Pass` | Fixture payload manifest contains four negative-test strings. |
| Production path/host/connection marker absent | `Pass` | Self-test rejects `E:\`, production markers, and MySQL URI patterns. |
| Personal/financial production data absent | `Pass by construction` | All names, IDs, codes, amounts, and filenames are synthetic. |
| Database/storage seed executed | `Not Run` | Docker daemon unavailable; no substitute production environment used. |

## Test command

```powershell
Push-Location backend
npm run test:synthetic-fixtures
Pop-Location
```

The self-test must pass before any fixture is copied into a disposable database. A future seed process must add an explicit anti-production guard, verify audit-specific host/database/storage identifiers, and fail closed when those identifiers are missing or resemble production.

## Limitations

This artifact proves fixture safety and completeness at module level only. It does not prove database constraints, tenant hooks, route authorization, storage ACLs, Socket.IO authorization, queue isolation, PDF/HTML rendering behavior, migration behavior, backup/restore, or RPO/RTO. Those require an available staging/disposable environment and remain `Not Verifiable`.

## Status

`Partially Verified`: safe synthetic fixture definitions and self-test are available; disposable persistence and integration execution are blocked by the unavailable Docker daemon/MySQL CLI.
