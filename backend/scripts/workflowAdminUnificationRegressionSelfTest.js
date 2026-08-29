'use strict';

/**
 * Self-test UNIT (tanpa DB) — Sprint 3, S3-3: Workflow Admin Single Source
 * of Truth.
 *
 * Sebelumnya ada 3 definisi admin paralel (ADR-0002 §3 butir 6, ditemukan
 * Sprint 3 audit GAP-02):
 *   1. approvalController.js — ADMIN_ROLES (dead code, tidak dipakai) — DIHAPUS
 *   2. approvalRoutes.js — ADMIN_ROLES lokal terpisah, dipakai allowRoles()
 *      untuk route approve/reject/revise — SEKARANG memakai WORKFLOW_ADMIN_ROLES
 *   3. planningWorkflowService.js — WORKFLOW_ADMIN_ROLES + isWorkflowAdminRole(),
 *      dipakai guardApproved.js + renjaController.js + rkpdController.js +
 *      renstraController.js — TETAP authoritative, tidak berubah semantics
 *
 * Test ini membuktikan: (a) approvalRoutes.js route guard sekarang memakai
 * ARRAY YANG SAMA PERSIS (reference identity, bukan cuma value yang kebetulan
 * sama) dengan WORKFLOW_ADMIN_ROLES; (b) allowRoles(WORKFLOW_ADMIN_ROLES) dan
 * isWorkflowAdminRole() menghasilkan keputusan identik untuk SETIAP role yang
 * dikenal aplikasi (SUPER_ADMIN, ADMINISTRATOR, PENGAWAS, PELAKSANA, dan role
 * SIGAP legacy yang dipetakan keduanya) — tidak ada celah timpang.
 *
 * TIDAK me-require approvalController.js/guardApproved.js langsung (keduanya
 * require ../models, trigger load penuh models/index.js) — konsisten dengan
 * pola self-test Sprint 1/2/S3-1.
 *
 * Jalankan: node scripts/workflowAdminUnificationRegressionSelfTest.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const allowRoles = require('../middlewares/allowRoles');
const {
  WORKFLOW_ADMIN_ROLES,
  isWorkflowAdminRole,
} = require('../services/planningWorkflowService');

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  OK  ${name}`);
  } catch (error) {
    fail++;
    console.log(`FAIL  ${name}\n      ${error.stack || error.message}`);
  }
}

function fakeReq(role) {
  return { user: role ? { role } : null };
}

function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return res;
}

function callAllowRoles(allowedRoles, role) {
  const req = fakeReq(role);
  const res = fakeRes();
  let calledNext = false;
  allowRoles(allowedRoles)(req, res, () => {
    calledNext = true;
  });
  return calledNext;
}

console.log('=== S3-3: Workflow Admin Single Source of Truth — regression tests ===');

test('approvalRoutes.js TIDAK lagi mendeklarasikan ADMIN_ROLES sebagai array literal terpisah', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'approvalRoutes.js'), 'utf8');
  assert.ok(
    !/const\s+ADMIN_ROLES\s*=\s*\[/.test(src),
    'approvalRoutes.js tidak boleh punya array literal ADMIN_ROLES sendiri lagi — ' +
      'harus mereferensikan WORKFLOW_ADMIN_ROLES dari planningWorkflowService.js',
  );
  assert.ok(
    /require\(["']\.\.\/services\/planningWorkflowService["']\)/.test(src),
    'approvalRoutes.js harus require planningWorkflowService.js',
  );
  assert.ok(
    /ADMIN_ROLES\s*=\s*WORKFLOW_ADMIN_ROLES/.test(src),
    'approvalRoutes.js harus menetapkan ADMIN_ROLES = WORKFLOW_ADMIN_ROLES (alias ke sumber authoritative)',
  );
});

test('approvalController.js TIDAK lagi punya ADMIN_ROLES dead code', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'approvalController.js'), 'utf8');
  assert.ok(
    !/const\s+ADMIN_ROLES\s*=/.test(src),
    'approvalController.js tidak boleh lagi mendeklarasikan ADMIN_ROLES (dead code sudah dihapus S3-3)',
  );
});

test('WORKFLOW_ADMIN_ROLES tetap ["SUPER_ADMIN", "ADMINISTRATOR"] — tidak ada role baru ditambahkan', () => {
  assert.deepStrictEqual([...WORKFLOW_ADMIN_ROLES].sort(), ['ADMINISTRATOR', 'SUPER_ADMIN']);
});

const ALL_KNOWN_ROLES = [
  'SUPER_ADMIN',
  'ADMINISTRATOR',
  'PENGAWAS',
  'PELAKSANA',
  // Role SIGAP legacy yang dipetakan oleh mapWorkflowRole() di planningWorkflowService.js
  'ADMIN',
  'KEPALA_DINAS',
  'SEKRETARIS',
  'KEPALA_BIDANG',
  'FUNGSIONAL',
  'GUBERNUR',
  null,
  undefined,
  '',
];

for (const role of ALL_KNOWN_ROLES) {
  test(`allowRoles(WORKFLOW_ADMIN_ROLES) vs isWorkflowAdminRole() konsisten untuk role=${JSON.stringify(role)}`, () => {
    const viaRouteGuard = callAllowRoles(WORKFLOW_ADMIN_ROLES, role);
    const viaWorkflowService = isWorkflowAdminRole(role);

    // CATATAN: allowRoles() memakai mapping SIGAP_TO_EPELARA sendiri di
    // allowRoles.js (KEPALA_DINAS/SEKRETARIS -> ADMINISTRATOR, dst), SEDANGKAN
    // isWorkflowAdminRole() memakai ROLE_COMPATIBILITY_MAP di
    // planningWorkflowService.js. Untuk role ADMIN/ADMINISTRATOR-equivalent
    // dan role non-admin murni (PENGAWAS/PELAKSANA-equivalent), kedua mapping
    // menghasilkan keputusan admin/bukan-admin YANG SAMA — inilah yang diuji
    // di sini (bukan bahwa kedua mapping tabel identik byte-for-byte, yang
    // di luar scope S3-3: "jangan mengubah semantics role existing").
    assert.strictEqual(
      viaRouteGuard,
      viaWorkflowService,
      `Route guard (allowRoles) dan workflow service (isWorkflowAdminRole) HARUS menghasilkan ` +
        `keputusan admin/bukan-admin yang sama untuk role="${role}". viaRouteGuard=${viaRouteGuard}, ` +
        `viaWorkflowService=${viaWorkflowService}`,
    );
  });
}

test('SUPER_ADMIN dan ADMINISTRATOR tetap admin (regresi fungsional dasar)', () => {
  assert.strictEqual(callAllowRoles(WORKFLOW_ADMIN_ROLES, 'SUPER_ADMIN'), true);
  assert.strictEqual(callAllowRoles(WORKFLOW_ADMIN_ROLES, 'ADMINISTRATOR'), true);
  assert.strictEqual(isWorkflowAdminRole('SUPER_ADMIN'), true);
  assert.strictEqual(isWorkflowAdminRole('ADMINISTRATOR'), true);
});

test('PENGAWAS dan PELAKSANA tetap BUKAN admin (regresi fungsional dasar)', () => {
  assert.strictEqual(callAllowRoles(WORKFLOW_ADMIN_ROLES, 'PENGAWAS'), false);
  assert.strictEqual(callAllowRoles(WORKFLOW_ADMIN_ROLES, 'PELAKSANA'), false);
  assert.strictEqual(isWorkflowAdminRole('PENGAWAS'), false);
  assert.strictEqual(isWorkflowAdminRole('PELAKSANA'), false);
});

console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
process.exit(fail > 0 ? 1 : 0);
