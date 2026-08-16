'use strict';

/**
 * Self-test UNIT (tanpa DB, tanpa server jalan) untuk regresi otorisasi
 * Sprint 1 Fase 2 (Unifikasi Role Admin).
 *
 * Memverifikasi middleware `allowRoles` berperilaku benar untuk KEEMPAT role
 * aplikasi (SUPER_ADMIN, ADMINISTRATOR, PENGAWAS, PELAKSANA) dengan cara
 * memanggil middleware langsung (bukan lewat HTTP), memakai req/res palsu.
 * Ini regresi PERILAKU MIDDLEWARE — bukan regresi "endpoint mana izinkan role
 * apa" (untuk itu, lihat backend/verify-role-unification.js yang memindai
 * definisi array role di tiap route file).
 *
 * Juga menguji KHUSUS 8 route yang diubah Fase 2 (dulu memakai role legacy
 * ADMIN/OPERATOR yang tidak pernah ada di tabel roles) — memastikan
 * ADMINISTRATOR sekarang bisa lewat (sebelumnya diam-diam ditolak), dan
 * role yang benar-benar tidak berhak (PENGAWAS/PELAKSANA) tetap ditolak.
 *
 * Jalankan: node scripts/allowRolesRegressionSelfTest.js
 */

const assert = require('assert');
const allowRoles = require('../middlewares/allowRoles');
const { SUPER_ADMIN, ADMINISTRATOR, PENGAWAS, PELAKSANA, ADMIN_ROLES, WRITE_ROLES } = require('../constants/roles');

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

function callMiddleware(allowedRoles, role) {
  const req = fakeReq(role);
  const res = fakeRes();
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };
  allowRoles(allowedRoles)(req, res, next);
  return { nextCalled, statusCode: res.statusCode, body: res.body };
}

console.log('=== Middleware allowRoles: perilaku dasar ===');

test('role yang diizinkan -> next() dipanggil', () => {
  const result = callMiddleware([SUPER_ADMIN, ADMINISTRATOR], ADMINISTRATOR);
  assert.strictEqual(result.nextCalled, true);
});

test('role yang tidak diizinkan -> 403, next() tidak dipanggil', () => {
  const result = callMiddleware([SUPER_ADMIN], PELAKSANA);
  assert.strictEqual(result.nextCalled, false);
  assert.strictEqual(result.statusCode, 403);
});

test('tidak ada user (belum login) -> 401', () => {
  const result = callMiddleware([SUPER_ADMIN], null);
  assert.strictEqual(result.statusCode, 401);
});

test('role SIGAP (ADMIN) dipetakan ke ADMINISTRATOR lewat SIGAP_TO_EPELARA', () => {
  const result = callMiddleware([ADMINISTRATOR], 'ADMIN');
  assert.strictEqual(result.nextCalled, true);
});

test('role lowercase/spasi dinormalisasi (super admin -> SUPER_ADMIN)', () => {
  const result = callMiddleware([SUPER_ADMIN], 'super admin');
  assert.strictEqual(result.nextCalled, true);
});

console.log('\n=== Regresi Fase 2: 8 route yang sebelumnya pakai role legacy ADMIN/OPERATOR ===');
console.log('(role tsb TIDAK PERNAH ada di tabel `roles` -> endpoint efektif SUPER_ADMIN-only sebelum Fase 2)\n');

test('SUPER_ADMIN tetap bisa akses (tidak boleh regresi)', () => {
  const result = callMiddleware(ADMIN_ROLES, SUPER_ADMIN);
  assert.strictEqual(result.nextCalled, true);
});

test('ADMINISTRATOR SEKARANG bisa akses (perbaikan Fase 2 — sebelumnya ditolak)', () => {
  const result = callMiddleware(ADMIN_ROLES, ADMINISTRATOR);
  assert.strictEqual(result.nextCalled, true);
});

test('PENGAWAS tetap ditolak (tidak boleh jadi kelonggaran tak disengaja)', () => {
  const result = callMiddleware(ADMIN_ROLES, PENGAWAS);
  assert.strictEqual(result.nextCalled, false);
  assert.strictEqual(result.statusCode, 403);
});

test('PELAKSANA tetap ditolak (tidak boleh jadi kelonggaran tak disengaja)', () => {
  const result = callMiddleware(ADMIN_ROLES, PELAKSANA);
  assert.strictEqual(result.nextCalled, false);
  assert.strictEqual(result.statusCode, 403);
});

console.log('\n=== Regresi Fase 2: route enrich-bab (dulu lowercase admin/operator/superadmin) ===');

test('SUPER_ADMIN bisa akses enrich-bab (WRITE_ROLES)', () => {
  const result = callMiddleware(WRITE_ROLES, SUPER_ADMIN);
  assert.strictEqual(result.nextCalled, true);
});

test('PELAKSANA bisa akses enrich-bab (WRITE_ROLES mengizinkan PELAKSANA, sama seperti auto-generate-bab sejenis)', () => {
  const result = callMiddleware(WRITE_ROLES, PELAKSANA);
  assert.strictEqual(result.nextCalled, true);
});

test('PENGAWAS TIDAK bisa akses enrich-bab (WRITE_ROLES tidak termasuk PENGAWAS)', () => {
  const result = callMiddleware(WRITE_ROLES, PENGAWAS);
  assert.strictEqual(result.nextCalled, false);
});

console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
process.exit(fail > 0 ? 1 : 0);
