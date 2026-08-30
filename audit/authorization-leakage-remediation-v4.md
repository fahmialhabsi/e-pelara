# Authorization and Cross-Tenant Leakage Remediation — Stage 4

**Date:** 2026-08-30  
**Scope:** High-risk DPA pergeseran/perubahan read, export, and object operations. The patch is repository-only and uses synthetic/static verification; no production data was queried.

## Implemented controls

`backend/controllers/dpaPergeseranController.js` now resolves the authoritative `Dpa.opd_id` before returning DPA tujuan data, rekening details, pergeseran lists, perubahan reads, and OPD-level financial exports. The existing fail-closed `assertDpaPergeseranOpdBoundary` helper is reused. The export handlers also verify ownership before rendering HTML/PDF data. A missing DPA returns `404`; an ownership mismatch returns the existing sanitized `403` response; boundary-resolution failure remains a temporary deny response.

The helper `loadDpaWithinBoundary` centralizes DPA lookup plus ownership enforcement for read routes, reducing the risk that a new route forgets to resolve the parent before querying child rows.

## Verification status

| Check | Status | Evidence |
|---|---|---|
| Modified controller parses | Pending final stage command output | `node --check backend/controllers/dpaPergeseranController.js` |
| Cross-OPD list/read/export denied | `Not Verifiable` | Requires route integration test with disposable database and two synthetic OPDs. |
| No client-supplied OPD accepted for these paths | `Partially Verified` | Scope is derived from loaded `Dpa.opd_id`; `opd_id` remains a route selector only and is checked against the loaded DPA. |
| Full cross-module authorization audit | `Open` | Renja, Renstra, RKPD, cascading, document, and other controllers still require route-by-route review. |

## Required acceptance tests

With two synthetic OPDs, authenticate users for each OPD and assert that `getDpaTujuan`, `getRincianRekening`, `listPergeseran`, `exportPdfPergeseran`, `exportPdfPerubahan`, `getPerubahan`, and `exportPdfSetelahPerubahanOpd` return `403` for the other OPD. Assert that the same-OPD path works, SUPER_ADMIN behavior follows approved policy, and no response reveals target existence beyond the approved status/message contract.

## Residual risks

This stage does not claim all object-level authorization gaps across every module are closed. It also does not establish database row-level security, storage ACLs, export watermarking, or production monitoring. Status: `Fixed Pending Retest`.
