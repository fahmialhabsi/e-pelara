"use strict";

const assert = require("assert");

/**
 * Mock `../models` SEBELUM require service, supaya getAuditDetail() bisa
 * diuji tanpa DB nyata. Regresi untuk IDOR lintas-tenant di getAuditDetail
 * (compliance & planning branch sebelumnya mengabaikan req.tenantId sama
 * sekali — lihat audit A2.3).
 */
const modelsPath = require.resolve("../models");

function makeRow(data) {
  return { ...data, toJSON: () => ({ ...data }) };
}

const tenantAuditLogs = new Map([
  [1, { id: 1, user_id: 10, aksi: "RPJMD_BULK_MASTER_COMMIT", tenant_id_asal: 5, tenant_id_tujuan: null, payload: { success: true }, created_at: new Date("2026-01-01") }],
]);
const planningAuditEvents = new Map([
  [1, { id: 1, module_name: "renja", table_name: "renja_program", record_id: 42, action_type: "UPDATE", old_value: {}, new_value: {}, change_reason_text: null, changed_by: 10, changed_at: new Date("2026-01-01"), version_before: 1, version_after: 2, snapshot: null }],
]);
const users = new Map([[10, { id: 10, username: "opd_tenant5", email: "opd5@example.test", tenant_id: 5 }]]);

const mockModels = {
  sequelize: {},
  TenantAuditLog: { findByPk: async (id) => (tenantAuditLogs.has(Number(id)) ? makeRow(tenantAuditLogs.get(Number(id))) : null) },
  PlanningAuditEvent: { findByPk: async (id) => (planningAuditEvents.has(Number(id)) ? makeRow(planningAuditEvents.get(Number(id))) : null) },
  User: { findByPk: async (id) => (users.has(Number(id)) ? makeRow(users.get(Number(id))) : null) },
};

require.cache[modelsPath] = { id: modelsPath, filename: modelsPath, loaded: true, exports: mockModels };

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

async function testGetAuditDetailTenantIsolation() {
  const foreignReq = { user: { role: "ADMINISTRATOR" }, tenantId: 999 };
  const ownerReq = { user: { role: "ADMINISTRATOR" }, tenantId: 5 };
  const superAdminReq = { user: { role: "SUPER_ADMIN" }, tenantId: 999 };

  // Compliance branch (TenantAuditLog): tenant lain tidak boleh baca detail.
  const foreignCompliance = await svc.getAuditDetail(foreignReq, "t-1");
  assert.strictEqual(foreignCompliance.ok, false, "tenant lain tidak boleh baca detail compliance");

  const ownerCompliance = await svc.getAuditDetail(ownerReq, "t-1");
  assert.strictEqual(ownerCompliance.ok, true, "tenant pemilik harus bisa baca detail compliance");
  assert.strictEqual(ownerCompliance.data.tenant_id_asal, 5);

  const superAdminCompliance = await svc.getAuditDetail(superAdminReq, "t-1");
  assert.strictEqual(superAdminCompliance.ok, true, "SUPER_ADMIN harus bisa baca lintas-tenant");

  // Planning branch (PlanningAuditEvent + actor.tenant_id): tenant lain tidak boleh baca detail.
  const foreignPlanning = await svc.getAuditDetail(foreignReq, "p-1");
  assert.strictEqual(foreignPlanning.ok, false, "tenant lain tidak boleh baca detail planning");

  const ownerPlanning = await svc.getAuditDetail(ownerReq, "p-1");
  assert.strictEqual(ownerPlanning.ok, true, "tenant pemilik harus bisa baca detail planning");
  assert.strictEqual(ownerPlanning.data.actor.tenant_id, 5);

  const superAdminPlanning = await svc.getAuditDetail(superAdminReq, "p-1");
  assert.strictEqual(superAdminPlanning.ok, true, "SUPER_ADMIN harus bisa baca planning lintas-tenant");
}

testDeriveCompliance();
testParseKey();
testGetAuditDetailTenantIsolation()
  .then(() => console.log("planningAuditDashboard.selfTest OK"))
  .catch((err) => {
    console.error("planningAuditDashboard.selfTest FAILED", err);
    process.exitCode = 1;
  });
