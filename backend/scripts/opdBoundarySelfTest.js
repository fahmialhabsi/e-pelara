"use strict";

const assert = require("node:assert/strict");
const {
  assertOpdBoundary,
  resolveOpdScope,
} = require("../helpers/opdBoundary");

const registry = {
  async findOne({ where }) {
    const rows = { "OPD A": { id: 10 }, "OPD B": { id: 20 } };
    return rows[where.nama_opd] || null;
  },
};

async function run() {
  const opdA = { user: { role: "ADMINISTRATOR", opd: "OPD A" } };
  const opdB = { user: { role: "ADMINISTRATOR", opd: "OPD B" } };
  const superAdmin = { user: { role: "SUPER_ADMIN" } };
  const noContext = { user: { role: "ADMINISTRATOR" } };

  const allowed = await assertOpdBoundary(opdA, { opd_id: 10 }, registry);
  assert.equal(allowed.ok, true);

  const denied = await assertOpdBoundary(opdA, { opd_id: 20 }, registry);
  assert.equal(denied.ok, false);
  assert.equal(denied.status, 403);
  assert.equal(denied.body.code, "OPD_BOUNDARY_FORBIDDEN");

  const missingContext = await resolveOpdScope(noContext, registry);
  assert.equal(missingContext.ok, false);
  assert.equal(missingContext.status, 403);

  const missingOwner = await assertOpdBoundary(opdA, {}, registry);
  assert.equal(missingOwner.ok, false);
  assert.equal(missingOwner.status, 503);
  assert.equal(missingOwner.body.code, "OPD_OWNER_MISSING");

  const bScope = await resolveOpdScope(opdB, registry);
  assert.equal(bScope.ok, true);
  assert.deepEqual(bScope.where, { opd_id: 20 });

  const adminScope = await resolveOpdScope(superAdmin, registry);
  assert.equal(adminScope.ok, true);
  assert.equal(adminScope.isSuperAdmin, true);
  assert.equal(Object.hasOwn(adminScope, "where"), false);

  console.log("OPD boundary self-test passed: allow, cross-OPD deny, missing-context deny, missing-owner fail-closed, and SUPER_ADMIN scope.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
