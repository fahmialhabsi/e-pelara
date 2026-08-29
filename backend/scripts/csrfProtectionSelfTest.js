'use strict';

/**
 * Self-test UNIT (tanpa DB, tanpa server jalan) — Sprint 3, S3-2: CSRF
 * Protection.
 *
 * Menguji logika inti `middlewares/csrfProtection.js` (fungsi `_check`)
 * langsung dengan req palsu — TIDAK memuat verifyToken.js (yang require
 * ../models dan men-trigger load penuh models/index.js) supaya test ini
 * tetap 100% DB-independent, konsisten dengan pola self-test Sprint 1/2.
 *
 * 7 test minimal wajib per instruksi Owner (2026-08-08):
 *   1. cookie-auth POST tanpa CSRF token -> reject
 *   2. cookie-auth PUT/PATCH/DELETE tanpa CSRF token -> reject
 *   3. cookie-auth dengan CSRF token valid -> pass
 *   4. CSRF token tidak valid (cookie != header) -> reject
 *   5. bearer-auth request tetap berfungsi (CSRF tidak diperiksa sama sekali)
 *   6. safe method (GET/HEAD/OPTIONS) tidak pernah diblokir, termasuk saat cookie-auth
 *   7. lifecycle cookie (setCsrfCookie/clearCsrfCookie) tidak menurunkan SameSite=Strict
 *
 * Jalankan: node scripts/csrfProtectionSelfTest.js
 */

const assert = require('assert');
const csrfProtection = require('../middlewares/csrfProtection');
const { generateCsrfToken, setCsrfCookie, clearCsrfCookie, CSRF_COOKIE_NAME } = require('../lib/csrfToken');

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

function fakeReq({ method, authViaCookie, cookieToken, headerToken }) {
  return {
    method,
    authViaCookie,
    cookies: cookieToken !== undefined ? { [CSRF_COOKIE_NAME]: cookieToken } : {},
    header(name) {
      if (String(name).toLowerCase() === 'x-csrf-token') return headerToken;
      return undefined;
    },
  };
}

console.log('=== S3-2: CSRF Protection — regression tests ===');

// 1. cookie-auth POST tanpa CSRF token -> reject
test('cookie-auth POST tanpa CSRF token -> reject (403)', () => {
  const req = fakeReq({ method: 'POST', authViaCookie: true, cookieToken: undefined, headerToken: undefined });
  const result = csrfProtection._check(req);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.code, 'CSRF_TOKEN_INVALID');
});

// 2. cookie-auth PUT/PATCH/DELETE tanpa CSRF token -> reject
test('cookie-auth PUT tanpa CSRF token -> reject', () => {
  const req = fakeReq({ method: 'PUT', authViaCookie: true, cookieToken: undefined, headerToken: undefined });
  assert.strictEqual(csrfProtection._check(req).ok, false);
});
test('cookie-auth PATCH tanpa CSRF token -> reject', () => {
  const req = fakeReq({ method: 'PATCH', authViaCookie: true, cookieToken: undefined, headerToken: undefined });
  assert.strictEqual(csrfProtection._check(req).ok, false);
});
test('cookie-auth DELETE tanpa CSRF token -> reject', () => {
  const req = fakeReq({ method: 'DELETE', authViaCookie: true, cookieToken: undefined, headerToken: undefined });
  assert.strictEqual(csrfProtection._check(req).ok, false);
});

// 3. cookie-auth dengan CSRF token valid -> pass
test('cookie-auth POST dengan CSRF token valid (cookie == header) -> pass', () => {
  const token = generateCsrfToken();
  const req = fakeReq({ method: 'POST', authViaCookie: true, cookieToken: token, headerToken: token });
  const result = csrfProtection._check(req);
  assert.strictEqual(result.ok, true);
});

// 4. CSRF token tidak valid (cookie != header) -> reject
test('cookie-auth POST dengan CSRF token tidak cocok (cookie != header) -> reject', () => {
  const req = fakeReq({
    method: 'POST',
    authViaCookie: true,
    cookieToken: generateCsrfToken(),
    headerToken: generateCsrfToken(), // beda nilai
  });
  const result = csrfProtection._check(req);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.code, 'CSRF_TOKEN_INVALID');
});
test('cookie-auth POST dengan header ada tapi cookie kosong -> reject', () => {
  const req = fakeReq({ method: 'POST', authViaCookie: true, cookieToken: undefined, headerToken: generateCsrfToken() });
  assert.strictEqual(csrfProtection._check(req).ok, false);
});

// 5. bearer-auth request tetap berfungsi (CSRF tidak pernah diperiksa)
test('bearer-auth (authViaCookie=false) POST tanpa CSRF token -> tetap pass', () => {
  const req = fakeReq({ method: 'POST', authViaCookie: false, cookieToken: undefined, headerToken: undefined });
  const result = csrfProtection._check(req);
  assert.strictEqual(result.ok, true, 'Bearer-authenticated request TIDAK BOLEH pernah diblokir CSRF check');
});
test('bearer-auth DELETE tanpa CSRF token -> tetap pass', () => {
  const req = fakeReq({ method: 'DELETE', authViaCookie: false, cookieToken: undefined, headerToken: undefined });
  assert.strictEqual(csrfProtection._check(req).ok, true);
});
test('authViaCookie belum diset (undefined, route belum lewat verifyToken) -> fail-open, tidak diblokir', () => {
  const req = fakeReq({ method: 'POST', authViaCookie: undefined, cookieToken: undefined, headerToken: undefined });
  assert.strictEqual(csrfProtection._check(req).ok, true);
});

// 6. safe method tidak pernah diblokir, termasuk saat cookie-auth
test('GET dengan cookie-auth tanpa CSRF token -> selalu pass', () => {
  const req = fakeReq({ method: 'GET', authViaCookie: true, cookieToken: undefined, headerToken: undefined });
  assert.strictEqual(csrfProtection._check(req).ok, true);
});
test('HEAD dengan cookie-auth tanpa CSRF token -> selalu pass', () => {
  const req = fakeReq({ method: 'HEAD', authViaCookie: true, cookieToken: undefined, headerToken: undefined });
  assert.strictEqual(csrfProtection._check(req).ok, true);
});
test('OPTIONS dengan cookie-auth tanpa CSRF token -> selalu pass', () => {
  const req = fakeReq({ method: 'OPTIONS', authViaCookie: true, cookieToken: undefined, headerToken: undefined });
  assert.strictEqual(csrfProtection._check(req).ok, true);
});

// 7. Lifecycle cookie: setCsrfCookie/clearCsrfCookie tidak menurunkan SameSite=Strict
test('setCsrfCookie memanggil res.cookie dengan sameSite:"strict" (tidak diturunkan)', () => {
  let captured = null;
  const fakeRes = { cookie: (name, value, opts) => { captured = { name, value, opts }; } };
  setCsrfCookie(fakeRes, 'abc123');
  assert.strictEqual(captured.name, CSRF_COOKIE_NAME);
  assert.strictEqual(captured.opts.sameSite, 'strict', 'CSRF cookie WAJIB tetap sameSite:strict');
  assert.strictEqual(captured.opts.httpOnly, false, 'CSRF cookie sengaja TIDAK httpOnly agar JS bisa membaca (double-submit pattern)');
});
test('clearCsrfCookie memanggil res.clearCookie dengan sameSite:"strict"', () => {
  let captured = null;
  const fakeRes = { clearCookie: (name, opts) => { captured = { name, opts }; } };
  clearCsrfCookie(fakeRes);
  assert.strictEqual(captured.name, CSRF_COOKIE_NAME);
  assert.strictEqual(captured.opts.sameSite, 'strict');
});
test('generateCsrfToken menghasilkan token unik dengan panjang memadai', () => {
  const t1 = generateCsrfToken();
  const t2 = generateCsrfToken();
  assert.notStrictEqual(t1, t2);
  assert.ok(t1.length >= 32, 'Token harus cukup panjang untuk tahan brute-force');
});

// Guard tambahan: pastikan authController.js dan authRoutes.js benar-benar
// memanggil setCsrfCookie/clearCsrfCookie pada seluruh titik lifecycle auth
// (login, register, refresh, logout) — regresi statis, tidak butuh server jalan.
test('authController.js memanggil setCsrfCookie pada login, register, dan refreshToken', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'controllers', 'authController.js'), 'utf8');
  const setCsrfCalls = (src.match(/setCsrfCookie\(/g) || []).length;
  assert.ok(
    setCsrfCalls >= 3,
    `authController.js harus memanggil setCsrfCookie() minimal 3x (register, login, refreshToken) — ditemukan ${setCsrfCalls}x`,
  );
});
test('authRoutes.js (live /logout handler) memanggil clearCsrfCookie', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'authRoutes.js'), 'utf8');
  assert.ok(
    /router\.post\(\s*"\/logout"[\s\S]*?clearCsrfCookie\(res\)/.test(src),
    'Handler /logout aktif di authRoutes.js (BUKAN authController.logout yang tidak dipakai routing) ' +
      'harus memanggil clearCsrfCookie(res)',
  );
});
test('verifyToken.js menyetel req.authViaCookie dan memanggil csrfProtection._check sebelum next()', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'middlewares', 'verifyToken.js'), 'utf8');
  assert.ok(/req\.authViaCookie\s*=/.test(src), 'verifyToken.js harus menyetel req.authViaCookie');
  assert.ok(/csrfProtection\._check\(req\)/.test(src), 'verifyToken.js harus memanggil csrfProtection._check(req)');
});

console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
process.exit(fail > 0 ? 1 : 0);
