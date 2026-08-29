"use strict";

const assert = require("node:assert/strict");
const {
  assertActorCanManageTarget,
  assertTenantMatch,
  canManageTarget,
  normalizeRole,
  resolvePrincipalTenant,
} = require("../helpers/iamAuthorization");

function run() {
  assert.equal(normalizeRole("super admin"), "SUPER_ADMIN");
  assert.equal(canManageTarget("ADMINISTRATOR", "PELAKSANA"), true);
  assert.equal(canManageTarget("ADMINISTRATOR", "ADMINISTRATOR"), false);
  assert.equal(canManageTarget("ADMINISTRATOR", "SUPER_ADMIN"), false);
  assert.equal(canManageTarget("SUPER_ADMIN", "SUPER_ADMIN"), true);

  const actor = { user: { id: 10, role: "ADMINISTRATOR", tenant_id: 7 }, tenantId: 7 };
  assert.equal(assertActorCanManageTarget(actor, "SUPER_ADMIN").ok, false);
  assert.equal(assertActorCanManageTarget(actor, "PELAKSANA").ok, true);
  assert.equal(assertTenantMatch(actor, 7).ok, true);
  assert.equal(assertTenantMatch(actor, 8).ok, false);
  assert.equal(assertTenantMatch({ user: { role: "ADMINISTRATOR" } }, 7).ok, false);
  assert.equal(assertTenantMatch({ user: { role: "SUPER_ADMIN" } }, 999).ok, true);
  assert.equal(resolvePrincipalTenant({ user: { tenant_id: 12 } }), 12);
  assert.equal(resolvePrincipalTenant({}), null);

  console.log("IAM authorization self-test passed: role hierarchy, tenant match, missing context, and SUPER_ADMIN exception.");
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
