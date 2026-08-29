'use strict';

/**
 * Sprint 3 — S3-2: CSRF protection middleware.
 *
 * WAJIB dipasang SETELAH verifyToken (butuh req.authViaCookie yang diset
 * oleh verifyToken.js). Aturan:
 *   1. Method aman (GET/HEAD/OPTIONS) — selalu lolos, tidak pernah diperiksa.
 *   2. Request yang terautentikasi via Authorization/Bearer header — selalu
 *      lolos tanpa CSRF check (bearer token tidak bisa "dipaksa terkirim"
 *      oleh cross-site request pihak ketiga, beda dengan cookie ambient).
 *   3. Request yang terautentikasi via cookie (req.authViaCookie === true)
 *      DAN method state-changing (POST/PUT/PATCH/DELETE) — WAJIB mengirim
 *      header X-CSRF-Token yang cocok dengan cookie csrfToken. Tidak cocok
 *      atau tidak ada -> 403.
 *
 * Tidak memaksa CSRF token pada bearer-only API (tidak ada alasan security
 * yang benar untuk itu — bearer header tidak rentan CSRF ambient-credential).
 * Tidak mengganggu GET/HEAD/OPTIONS.
 */

const { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } = require('../lib/csrfToken');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Logika inti CSRF check, murni (tidak menyentuh req/res selain baca) —
 * dipakai bersama oleh middleware standalone di bawah DAN oleh
 * verifyToken.js (dipanggil inline setelah otentikasi berhasil, supaya
 * req.authViaCookie sudah pasti diset sebelum keputusan CSRF diambil).
 * Satu implementasi, dua titik pemakaian — tidak ada logika terduplikasi.
 */
function check(req) {
  if (SAFE_METHODS.has(req.method)) {
    return { ok: true };
  }

  // Bearer-authenticated request: tidak rentan CSRF ambient-credential,
  // tidak perlu CSRF token. (req.authViaCookie diset oleh verifyToken.js;
  // jika belum pernah diset — request belum lewat verifyToken — perlakukan
  // sebagai "bukan cookie-auth" secara aman/fail-open, supaya middleware ini
  // tidak memblokir route yang tidak memakai verifyToken sama sekali.)
  if (!req.authViaCookie) {
    return { ok: true };
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.header(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return {
      ok: false,
      code: 'CSRF_TOKEN_INVALID',
      message: 'Permintaan ditolak: CSRF token tidak valid atau tidak ada. Muat ulang halaman dan coba lagi.',
    };
  }

  return { ok: true };
}

function csrfProtection(req, res, next) {
  const result = check(req);
  if (!result.ok) {
    return res.status(403).json({
      success: false,
      code: result.code,
      message: result.message,
    });
  }
  return next();
}

csrfProtection._check = check;

module.exports = csrfProtection;
