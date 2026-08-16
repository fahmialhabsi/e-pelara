'use strict';

/**
 * Daftar tabel kritis untuk restore integrity verification (Sprint 2, S2-2).
 *
 * TIDAK DIKARANG — diturunkan langsung dari REQUIRED_SCHEMA yang sudah
 * dipakai `backend/scripts/checkDbSchema.js` (baseline skema minimum
 * resmi proyek, dipelihara terpisah dan sudah jadi konvensi tim: "sesuaikan
 * jika model/tabel inti berubah. Lihat docs/DATABASE.md"). Modul ini hanya
 * mengekstrak nama tabelnya untuk dipakai restore verification, supaya
 * definisi "tabel kritis" TIDAK bercabang dua (satu di checkDbSchema.js,
 * satu lagi di sini) — importnya sama.
 */

const path = require('path');

function getCriticalTableNames() {
  // require checkDbSchema.js akan MENJALANKAN main() (top-level script,
  // bukan module.exports) jika dipanggil apa adanya — jadi kita re-declare
  // list yang identik di sini SUPAYA tidak menjalankan efek samping
  // (koneksi DB) hanya untuk membaca daftar nama tabel. Daftar ini WAJIB
  // disinkronkan manual dengan REQUIRED_SCHEMA di checkDbSchema.js — kedua
  // file saling mereferensikan lewat komentar ini, bukan lewat import,
  // karena checkDbSchema.js tidak mengekspor modul (murni script CLI).
  //
  // Sumber: backend/scripts/checkDbSchema.js REQUIRED_SCHEMA (baris ~28-56
  // per Agustus 2026). Jika REQUIRED_SCHEMA berubah, perbarui juga di sini.
  return ['users', 'roles', 'divisions', 'periode_rpjmds'];
}

/** Sanity-check opsional: baca file checkDbSchema.js dan pastikan nama
 * tabel di atas masih muncul di sana (deteksi drift antara dua daftar
 * tanpa menjalankan script tersebut). Dipakai self-test, bukan runtime. */
function verifySyncWithCheckDbSchema() {
  const fs = require('fs');
  const checkDbSchemaPath = path.join(__dirname, '..', 'checkDbSchema.js');
  const content = fs.readFileSync(checkDbSchemaPath, 'utf8');
  const names = getCriticalTableNames();
  const missing = names.filter((t) => !content.includes(`table: "${t}"`));
  return { inSync: missing.length === 0, missing };
}

module.exports = { getCriticalTableNames, verifySyncWithCheckDbSchema };
