'use strict';

/**
 * Guard keselamatan untuk uploads backup engine (Sprint 2, S2-01C) — pure
 * functions, dipisah supaya bisa di-unit-test tanpa filesystem nyata di
 * backend/uploads/. Prinsip paling penting (Owner, mandat Sprint 2 §12.6):
 * backup TIDAK PERNAH boleh mengarsipkan path di luar direktori uploads
 * yang dimaksud, baik lewat symlink maupun manipulasi path traversal.
 */

const path = require('path');

/**
 * Pastikan sebuah path absolut hasil resolusi tetap berada di dalam root
 * yang diizinkan. Dipakai untuk menolak entry symlink/relative path yang
 * mencoba keluar dari boundary uploads root sebelum diarsipkan.
 *
 * @param {string} candidateAbsolutePath - path absolut yang sudah di-resolve
 *   (mis. hasil fs.realpathSync untuk mengikuti symlink)
 * @param {string} allowedRootAbsolutePath - root yang diizinkan (uploads dir)
 * @throws {Error} jika candidateAbsolutePath tidak berada di dalam root
 */
function assertWithinRoot(candidateAbsolutePath, allowedRootAbsolutePath) {
  const normalizedCandidate = path.resolve(candidateAbsolutePath);
  const normalizedRoot = path.resolve(allowedRootAbsolutePath);

  const relative = path.relative(normalizedRoot, normalizedCandidate);
  const escapesRoot =
    relative === '' ? false : relative.startsWith('..') || path.isAbsolute(relative);

  if (escapesRoot) {
    throw new Error(
      `HARD REJECT: path "${normalizedCandidate}" berada di luar boundary uploads root "${normalizedRoot}" (kemungkinan symlink/path traversal). Entry ini TIDAK diarsipkan.`,
    );
  }
}

/**
 * Hard-reject: backup uploads TIDAK BOLEH menyasar direktori aplikasi
 * lain yang bukan uploads (mis. salah konfigurasi UPLOADS_DIR menunjuk ke
 * backend/ itu sendiri atau ke root repo). Guard longgar berbasis nama
 * folder akhir + keberadaan penanda — bukan validator penuh, tapi cukup
 * untuk menolak kesalahan konfigurasi yang jelas.
 */
function assertLooksLikeUploadsDir(uploadsDirAbsolutePath) {
  const base = path.basename(path.resolve(uploadsDirAbsolutePath));
  if (!/uploads/i.test(base)) {
    throw new Error(
      `HARD REJECT: direktori target ("${uploadsDirAbsolutePath}") tidak terlihat seperti direktori uploads (nama folder akhir tidak mengandung "uploads"). Periksa UPLOADS_DIR/konfigurasi sebelum melanjutkan.`,
    );
  }
}

/**
 * Hard-reject: restore verification TIDAK PERNAH boleh menimpa direktori
 * uploads aplikasi yang sesungguhnya. Sama seperti assertNotSourceDatabase
 * di restoreSafety.js, tapi untuk filesystem — bandingkan path absolut yang
 * sudah di-resolve (bukan string mentah) supaya "../uploads" dkk tetap
 * tertangkap.
 */
function assertNotRealUploadsDir(targetAbsolutePath, realUploadsAbsolutePath) {
  const normalizedTarget = path.resolve(targetAbsolutePath);
  const normalizedReal = path.resolve(realUploadsAbsolutePath);
  if (normalizedTarget === normalizedReal) {
    throw new Error(
      `HARD REJECT: target restore-verification ("${normalizedTarget}") sama dengan direktori uploads aplikasi yang sesungguhnya ("${normalizedReal}"). Restore verification tidak pernah boleh menimpa uploads asli.`,
    );
  }
}

/**
 * Guard tambahan: target restore-verification wajib memakai prefix
 * temporary resmi, konsisten dengan pola assertIsTemporaryDatabaseName di
 * restoreSafety.js.
 */
function assertIsTemporaryRestoreDir(targetAbsolutePath, expectedPrefix = 'epelara_uploads_restore_verify') {
  const base = path.basename(path.resolve(targetAbsolutePath));
  if (!base.startsWith(`${expectedPrefix}_`)) {
    throw new Error(
      `HARD REJECT: nama direktori restore-verification ("${base}") tidak memakai prefix temporary resmi "${expectedPrefix}_".`,
    );
  }
}

module.exports = {
  assertWithinRoot,
  assertLooksLikeUploadsDir,
  assertNotRealUploadsDir,
  assertIsTemporaryRestoreDir,
};
