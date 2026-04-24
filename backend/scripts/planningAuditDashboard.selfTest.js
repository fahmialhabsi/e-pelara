"use strict";

const assert = require("assert");
const svc = require("../services/planningAuditDashboardService");

function testDeriveCompliance() {
  assert.strictEqual(
    svc.deriveComplianceUiStatus("RPJMD_RKPD_SYNC_COMMIT_REJECTED", { success: false }),
    "rejected",
  );
  assert.strictEqual(
    svc.deriveComplianceUiStatus("RPJMD_BULK_MASTER_PREVIEW", { success: true }),
    "preview",
  );
  assert.strictEqual(
    svc.deriveComplianceUiStatus("RPJMD_BULK_MASTER_COMMIT", { success: true }),
    "success",
  );
  assert.strictEqual(
    svc.deriveComplianceUiStatus("RPJMD_BULK_MASTER_COMMIT", { success: false }),
    "failure",
  );
}

function testParseKey() {
  assert.deepStrictEqual(svc.parseCompositeKey("t-12"), {
    source: "compliance",
    id: 12,
  });
  assert.deepStrictEqual(svc.parseCompositeKey("p-99"), {
    source: "planning",
    id: 99,
  });
  assert.strictEqual(svc.parseCompositeKey("bad"), null);
}

testDeriveCompliance();
testParseKey();
console.log("planningAuditDashboard.selfTest OK");
