# Disposable Upgrade-Gate Simulation — v5

**Date:** 2026-08-30  
**Target:** `epelara-audit-v5-mysql` / `epelara_audit_v5` / `127.0.0.1:13317`.  
**Production access:** None.  
**Active migration execution:** Not run.

## Scope

This simulation uses only a sanitized migration-name list and a disposable `SequelizeMeta` table. The fixture contains three migration names for the RPJMD indicator table creators. It contains no credentials, application data, PII, production identifiers, or provider data.

The harness creates `SequelizeMeta` in the disposable database, inserts the three synthetic applied markers, reads them back, writes a process-scoped sanitized JSON file, invokes `controlledMigrationChainGate.js` in `UPGRADE_DISPOSABLE` mode, and drops the synthetic metadata table during cleanup.

Command:

```powershell
npm --prefix backend run test:upgrade-gate-disposable
```

## Results

| Check | Result |
|---|---|
| Exact disposable container/image/state | `PASS` |
| Loopback host/port guard | `PASS` |
| Exact audit database guard | `PASS` |
| Sanitized fixture has no credentials/application data | `PASS` |
| SequelizeMeta synthetic insert/readback | `PASS` |
| Upgrade mode and applied-history file provided | `PASS` |
| Controlled gate accepts applied-history presence | `PASS` |
| Duplicate active-prefix detection | `BLOCK` as expected |
| Premature AUD-003 detection | `BLOCK` as expected |
| Missing applied-history decision | Not emitted because sanitized history was supplied |
| Active migration chain | `NOT_RUN` |
| Production access/data | `NOT_USED` |
| Cleanup | `PASS` — synthetic `SequelizeMeta` removed |

The process exited with code `0`. The controlled gate returned exit code `2` internally because the active chain remains unresolved; the harness treats that explicit block as the expected success condition for this simulation.

## Interpretation

The simulation proves that an upgrade-like target can provide sanitized applied history and still be blocked explicitly when duplicate active prefixes and AUD-003 are unresolved. It does not prove that any real nonproduction environment has applied the three names, because the table was synthetic and created only for this test.

The simulation does not import or execute any active migration, does not modify historical filenames, and does not write to production metadata. It also does not decide how to reconcile an applied history containing one of the four duplicate-prefix files; that decision remains owner/DBA work.

## Status

`Verified` for sanitized applied-history transport and explicit controlled-gate blocking. `Not Verifiable` for real environment applied state. `Open` for final fresh-install/upgrade chain policy and owner/DBA activation approval. `AUD-003` remains `Fixed Pending Retest / Open Release Blocker`.
