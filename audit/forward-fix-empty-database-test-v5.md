# AUD-003 Empty-Database Test — v5

**Date:** 2026-08-30  
**Target:** Disposable MySQL `epelara_audit_v5` in container `epelara-audit-v5-mysql`.  
**Production access:** None.

## Guard

The harness verified the exact audit container, MySQL image `mysql:8.0.46`, loopback host `127.0.0.1`, audit database `epelara_audit_v5`, and disposable-only approval variables before connecting. Temporary credentials were injected through process environment and not printed or persisted.

## Test

```powershell
$env:EPELARA_TEST_HOST='127.0.0.1'
$env:EPELARA_TEST_PORT='13317'
$env:EPELARA_TEST_DATABASE='epelara_audit_v5'
$env:EPELARA_FORWARD_FIX_MODE='DISPOSABLE_ONLY'
$env:EPELARA_AUDIT_DATABASE='epelara_audit_v5'
$env:EPELARA_AUDIT_HOST='127.0.0.1'
$env:EPELARA_FORWARD_FIX_APPROVED='true'
npm --prefix backend run test:forward-fix-disposable
```

The test first removed only its own synthetic target tables in the disposable database and confirmed that zero target tables existed. It invoked the draft `up` function. The draft failed closed because the target tables did not exist, and the test confirmed that zero target tables remained afterward.

## Result

`PASS`: empty schema was rejected before schema mutation. This validates the draft’s table dependency guard and confirms that the draft does not create unrelated schema objects. The harness initially exposed and corrected a SQL quoting defect in its own table-count assertion; the corrected run passed. The forward-fix migration itself was not modified by that correction.

## Limitations

This test does not prove the active migration chain is valid, does not run any existing migration, and does not prove upgrade/restore behavior. It only validates fail-closed behavior on an empty disposable schema. The finding `AUD-003` remains open until representative, duplicate-key, failure/recovery, authoritative applied-history, and independent-review gates pass.
