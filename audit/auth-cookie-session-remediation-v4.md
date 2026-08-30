# Authentication and Cookie Session Remediation — Stage 3

**Date:** 2026-08-30  
**Scope:** Remove credential-bearing URLs and migrate local e-PeLARA authentication to httpOnly-cookie session bootstrap. No production credentials, sessions, or data were accessed.

## Changes

The backend now accepts authentication only from the `Authorization: Bearer` header or the `token` cookie; the legacy `req.query._token` fallback was removed from `backend/middlewares/verifyToken.js`. The CSRF ambient-credential flag now reflects cookie authentication only. Local and SSO verification explicitly allow HS256, matching the repository’s symmetric `jwt.sign` usage; SSO provider compatibility must be confirmed before deployment.

Tenant derivation in `verifyToken.js` now fails closed when a token has no valid positive `tenant_id`, instead of silently defaulting to tenant 1. A SUPER_ADMIN may still switch to an existing tenant through the server-validated `X-Tenant-Id` flow; non-SUPER_ADMIN requests cannot use that header to expand scope.

`authController.js` no longer returns access or refresh tokens in registration, login, or refresh JSON responses. The httpOnly cookies remain the credential transport. A protected `/api/auth/me` endpoint was added so the frontend can hydrate the session without decoding or storing a browser-readable JWT.

`authService.js`, `api.js`, and `AuthProvider.jsx` now use cookie-backed session bootstrap and cookie refresh. The shared API interceptor no longer injects a JWT from localStorage. LK preview and PDF download actions in `lkApi.js` and `LkGeneratorPage.jsx` now use authenticated blob requests rather than query-string tokens.

## Verification status

| Check | Status | Notes |
|---|---|---|
| Backend `node --check` for modified auth files | `Verified` | All modified backend auth files parsed successfully. |
| Frontend production build | `Verified` | Build completed successfully; the bundler emitted only existing chunk-size/module-type warnings. |
| Targeted auth/LK lint | `Partially Verified` | 3 errors and 3 warnings remain: 2 `eqeqeq`, 1 `react-hooks/set-state-in-effect`, and 3 `react-hooks/exhaustive-deps`. |
| Frontend full test suite | `Not Verifiable in this run` | The long-running aggregate test command did not return a reliable completion record; prior baseline remains 237/237. |
| Cookie login → `/auth/me` → protected API | Not Verifiable | Requires an isolated running API and synthetic account. |
| Refresh rotation/revocation and logout invalidation | Not Verifiable | Existing refresh design still needs server-side revocation/rotation and live tests. |
| SSO query bootstrap compatibility | Open | The old URL token behavior is intentionally removed; an approved one-time server-side SSO exchange is required if that integration remains active. |

## Required acceptance tests

Use a disposable environment with synthetic users. Assert that login/register response bodies contain no access or refresh token; cookies are `httpOnly`, `secure` in production, and `sameSite=strict`; `/auth/me` returns the authenticated principal only with a valid cookie; `_token` query requests receive `401`; a missing/invalid tenant claim is denied for ordinary users; SUPER_ADMIN tenant switching is authorized and audited; refresh/logout behavior is tested; and LK preview/download work with blob requests without a credential in the URL.

## Residual risks

This stage does not implement refresh-token rotation/revocation, MFA, account lockout, SSO one-time exchange, or global removal of every token-bearing URL outside the identified LK flow. The work is `Fixed Pending Retest`, not `Closed Verified`, until endpoint-level tests and owner-approved SSO behavior are complete.
