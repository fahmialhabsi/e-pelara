# Input/Output Security and Error Handling Remediation — Stage 6

**Date:** 2026-08-30  
**Scope:** DPA pergeseran/perubahan HTML/PDF export and error responses.

## Implemented controls

`backend/controllers/dpaPergeseranController.js` now escapes database-backed signer names, account codes, descriptions, OPD labels, and other item labels before interpolation into the Puppeteer HTML templates. Numeric amounts continue to be formatted numerically. This reduces HTML/PDF injection risk from stored labels and descriptions.

The controller’s generic 500 responses no longer return raw exception messages. Clients receive a stable sanitized message and `DPA_INTERNAL_ERROR` code, while internal error logging remains an operational responsibility. Boundary failures remain sanitized 403/503 responses.

DPA pergeseran/perubahan read, export, and OPD-level export routes now perform parent-derived ownership checks before returning or rendering financial content. This stage builds on the stage-4 authorization patch.

The frontend LK preview/PDF actions from stage 3 already use authenticated blob requests and no longer place access tokens in query strings.

## Verification status

| Check | Status | Evidence |
|---|---|---|
| DPA controller syntax | `Verified` | `node --check` passed before commit. |
| Stored-label escaping in targeted templates | `Partially Verified` | Escape helper and high-risk row/OPD fields are present; full template field-by-field review remains. |
| Raw DPA exception disclosure | `Fixed` for targeted controller catches | Generic 500 response messages are sanitized in this controller. |
| XSS/PDF injection integration test | `Not Verifiable` | Requires route-level synthetic fixture and PDF content inspection. |
| File upload/path traversal/SSRF across all modules | `Open` | Requires separate route-by-route audit. |

## Required acceptance tests

Submit synthetic labels containing HTML, quote, URL, and script-like characters through DPA fields; generate PDF/HTML; assert the output contains escaped text and no executable markup. Force database and Puppeteer failures and assert the response contains only the stable error code/message. Test same-OPD and cross-OPD export behavior with two synthetic tenants.

## Residual risks

Not all HTML/PDF generators in the repository have been reviewed. CSP, storage ACL, upload MIME/content validation, SSRF controls, and production log redaction remain open. Status: `Fixed Pending Retest`.
