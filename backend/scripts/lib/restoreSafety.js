'use strict';

/**
 * Guard keselamatan restore — pure functions, dipisah supaya bisa
 * di-unit-test tanpa DB nyata. Prinsip paling penting Sprint 2 (Owner):
 * restore verification TIDAK PERNAH boleh menyentuh database aplikasi
 * (source/production), HANYA database temporary yang di-generate sendiri.
 */

const crypto = require('crypto');

/**
 * Generate nama database temporary unik. Prefix tetap dan mudah dikenali
 * untuk keperluan audit/cleanup manual darurat jika Node crash sebelum
 * sempat DROP.
 */
function generateTempDatabaseName(prefix = 'epelara_restore_verify') {
  const ts = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Hard-reject: target restore TIDAK BOLEH sama dengan database
 * sumber/aplikasi aktif (dibaca dari config aktif, bukan literal string
 * "db_epelara" semata — nama DB produksi/dev bisa berbeda per environment).
 *
 * @param {string} targetDatabase - nama DB tujuan restore
 * @param {string} sourceDatabase - nama DB aplikasi aktif (dari config/env)
 * @throws {Error} jika targetDatabase === sourceDatabase (case-insensitive)
 */
function assertNotSourceDatabase(targetDatabase, sourceDatabase) {
  if (!targetDatabase || !sourceDatabase) {
    throw new Error('assertNotSourceDatabase: targetDatabase dan sourceDatabase wajib diisi.');
  }
  if (String(targetDatabase).toLowerCase() === String(sourceDatabase).toLowerCase()) {
    throw new Error(
      `HARD REJECT: target restore ("${targetDatabase}") sama dengan database aplikasi aktif ("${sourceDatabase}"). Restore verification tidak pernah boleh menyentuh database aplikasi.`,
    );
  }
}

/**
 * Guard tambahan: target juga wajib memakai prefix temporary resmi, supaya
 * tidak mungkin salah ketik/salah passing argumen menyasar DB lain yang
 * kebetulan bukan source tapi juga bukan DB temporary yang sah (mis. DB
 * staging orang lain).
 */
function assertIsTemporaryDatabaseName(targetDatabase, expectedPrefix = 'epelara_restore_verify') {
  if (!String(targetDatabase || '').startsWith(`${expectedPrefix}_`)) {
    throw new Error(
      `HARD REJECT: nama database restore ("${targetDatabase}") tidak memakai prefix temporary resmi "${expectedPrefix}_". Restore verification hanya boleh menyasar DB yang di-generate oleh generateTempDatabaseName().`,
    );
  }
}

/**
 * Verifikasi checksum SHA-256 sebelum restore dimulai. Reject jika mismatch
 * (backup file mungkin corrupt/dimodifikasi).
 */
function assertChecksumMatches(computedSha256, manifestSha256) {
  if (!computedSha256 || !manifestSha256) {
    throw new Error('assertChecksumMatches: kedua checksum wajib diisi.');
  }
  if (computedSha256 !== manifestSha256) {
    throw new Error(
      `HARD REJECT: checksum SHA-256 file backup tidak cocok dengan manifest (file mungkin corrupt/berubah). computed=${computedSha256} manifest=${manifestSha256}`,
    );
  }
}

/**
 * Validasi manifest minimal sebelum dipakai untuk restore. Reject manifest
 * yang tidak lengkap/tidak valid daripada mencoba restore dengan asumsi.
 */
function assertValidManifest(manifest) {
  const requiredFields = ['backup_id', 'database', 'environment', 'filename', 'sha256', 'status'];
  const missing = requiredFields.filter((f) => !manifest || manifest[f] === undefined || manifest[f] === null || manifest[f] === '');
  if (missing.length > 0) {
    throw new Error(`HARD REJECT: manifest tidak valid, field wajib hilang: ${missing.join(', ')}`);
  }
  if (manifest.status !== 'SUCCESS') {
    throw new Error(`HARD REJECT: manifest berstatus "${manifest.status}", bukan SUCCESS — tidak boleh dipakai untuk restore verification.`);
  }
}

module.exports = {
  generateTempDatabaseName,
  assertNotSourceDatabase,
  assertIsTemporaryDatabaseName,
  assertChecksumMatches,
  assertValidManifest,
};
