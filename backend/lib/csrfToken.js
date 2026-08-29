'use strict';

/**
 * Sprint 3 — S3-2: CSRF protection helper (double-submit-cookie pattern).
 *
 * Desain (Phase B audit, Owner 2026-08-08):
 * - Frontend SPA (src/services/api.js) selalu mengirim `Authorization: Bearer
 *   <token>` dari localStorage pada setiap request yang punya token, DAN
 *   `withCredentials: true` (cookie ikut terkirim juga). verifyToken.js
 *   memprioritaskan Bearer di atas cookie (bearer?.token || req.cookies?.token).
 *   Artinya trafik SPA normal secara de facto terautentikasi via Bearer —
 *   token yang tidak bisa "dipaksa terkirim" oleh cross-site request pihak
 *   ketiga (localStorage tidak bisa dibaca lintas origin, custom header tidak
 *   auto-terkirim oleh <form>/img/fetch cross-site tanpa CORS preflight yang
 *   lolos allowlist).
 * - Tapi cookie httpOnly (`token`) tetap merupakan jalur otentikasi valid yang
 *   AKTIF (fallback di verifyToken.js baris ~135) — permukaan CSRF nyata ada
 *   pada request yang (secara sengaja atau karena caller lain di luar SPA
 *   utama) mengandalkan cookie saja tanpa header Authorization.
 * - sameSite:"strict" pada cookie auth SUDAH memblokir sebagian besar CSRF
 *   klasik (cookie tidak terkirim pada request cross-site). CSRF token di
 *   sini adalah LAPISAN KEDUA (defense-in-depth) untuk skenario same-site/
 *   subdomain atau browser yang tidak sepenuhnya menghormati SameSite —
 *   BUKAN pengganti SameSite=Strict (tidak diturunkan/dihapus).
 *
 * Pola: double-submit cookie. Cookie `csrfToken` (TIDAK httpOnly — sengaja,
 * supaya JS frontend bisa membacanya) diset saat login/register/refresh.
 * Client wajib mengirim ulang nilai yang sama di header `X-CSRF-Token` pada
 * request state-changing yang cookie-authenticated. Server membandingkan
 * cookie vs header — cross-site attacker bisa membuat browser korban
 * mengirim cookie secara otomatis, TAPI tidak bisa membaca nilai cookie
 * tersebut (beda origin) sehingga tidak bisa menyalin nilainya ke header.
 */

const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Set cookie csrfToken (readable oleh JS, bukan httpOnly) — dipanggil bersamaan dengan set cookie auth. */
function setCsrfCookie(res, token, { maxAge } = {}) {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: maxAge || 60 * 60 * 1000,
  });
}

/** Hapus cookie csrfToken — dipanggil bersamaan dengan clearCookie auth saat logout. */
function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
}

module.exports = {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
};
