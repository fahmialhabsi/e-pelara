const assert = require('assert');
const { auditSyntheticFixtures, syntheticSecret } = require('../fixtures/auditSyntheticFixtures');

const tenantIds = new Set(auditSyntheticFixtures.tenants.map((tenant) => tenant.id));
const opdIds = new Set(auditSyntheticFixtures.opds.map((opd) => opd.id));

assert.strictEqual(auditSyntheticFixtures.tenants.length, 2);
assert.strictEqual(auditSyntheticFixtures.opds.length, 2);
assert.ok(auditSyntheticFixtures.users.some((user) => user.role === 'SUPER_ADMIN'));
assert.ok(auditSyntheticFixtures.users.some((user) => user.role === 'PENGAWAS'));
assert.ok(auditSyntheticFixtures.users.some((user) => user.tenant_id === null));
assert.ok(auditSyntheticFixtures.users.some((user) => user.active === false));
assert.ok(auditSyntheticFixtures.users.some((user) => user.target_role === 'SUPER_ADMIN'));
assert.ok(auditSyntheticFixtures.business_domains.includes('JURNAL'));
assert.ok(auditSyntheticFixtures.business_domains.includes('DOKUMEN_RESMI'));
assert.ok(auditSyntheticFixtures.business_domains.includes('ESIGAP_COMMAND'));
assert.ok(Object.values(auditSyntheticFixtures.payloads).every(Boolean));
assert.ok(syntheticSecret.includes('AUDIT_ONLY_DUMMY'));
assert.ok(!/password|token|api[_-]?key|private[_-]?key|connection[_-]?string/i.test(syntheticSecret));

for (const opd of auditSyntheticFixtures.opds) {
  assert.ok(tenantIds.has(opd.tenant_id), `OPD ${opd.id} must reference a synthetic tenant`);
}
for (const record of auditSyntheticFixtures.records) {
  assert.ok(tenantIds.has(record.tenant_id), `Record ${record.id} must reference a synthetic tenant`);
  assert.ok(opdIds.has(record.opd_id), `Record ${record.id} must reference a synthetic OPD`);
}
for (const account of auditSyntheticFixtures.account_registry) {
  assert.ok(tenantIds.has(account.tenant_id), `Account ${account.id} must be tenant-scoped in the fixture`);
  assert.strictEqual(account.secret, syntheticSecret);
}

const serialized = JSON.stringify(auditSyntheticFixtures);
assert.ok(!/E:\\|production|prod-db|mysql:\/\//i.test(serialized));
console.log('Synthetic fixture safety self-test passed: two tenants, OPDs, role edge cases, domain records, classifications, and dummy credential safeguards.');
