'use strict';

/**
 * Ambil kandidat Program/Kegiatan/Sub Kegiatan + Anggaran Target/Realisasi
 * dari DPA+Penatausahaan untuk mengisi form ProSN B.1.1/B.1.2 (dukungan_program).
 *
 * Tidak ada FK yang menghubungkan indikator ProSN ke satu Sub Kegiatan tertentu
 * (renja_dukungan_prosn_tematik_id kosong di semua baris, tabel referensinya pun
 * belum di-assign ke OPD manapun) — jadi ini menyajikan SEMUA Sub Kegiatan DPA
 * tahun tsb sebagai kandidat, operator yang memilih mana yang relevan.
 *
 * Anggaran Target = SUM(dpa.anggaran); Anggaran Realisasi = SUM(penatausahaan.jumlah)
 * di-pre-agregat per dpa_id DULU sebelum join, supaya SUM(d.anggaran) tidak fan-out
 * kalau satu DPA punya banyak baris Penatausahaan — pola sama persis dengan bagian
 * 9c lakipGeneratorController.js (collectLakipData), yang sudah terverifikasi benar.
 *
 * DPA.opd_id SENGAJA tidak dipakai untuk scoping OPD di sini — dibuktikan tidak
 * match dengan perangkat_daerah.id (mis. Dinas Pangan id=3 di perangkat_daerah,
 * tapi opd_id=107 di semua baris DPA/RKA-nya, dua ruang ID yang berbeda tanpa FK
 * penghubung). lakipGeneratorController.js pun mengagregasi DPA hanya dengan
 * scope `tahun`, tanpa opd_id — pola itu yang diikuti di sini juga.
 */

const { sequelize } = require('../../models');

async function listDukunganProgramDariSistem(tahun, kodeSubKegiatan = null) {
  const [rows] = await sequelize.query(
    `SELECT d.kode_program, d.program, d.kode_kegiatan, d.kegiatan,
            d.kode_sub_kegiatan, d.sub_kegiatan,
            SUM(d.anggaran) AS anggaran_target,
            SUM(COALESCE(realPerDpa.total_realisasi, 0)) AS anggaran_realisasi
     FROM dpa d
     LEFT JOIN (
       SELECT dpa_id, SUM(jumlah) AS total_realisasi
       FROM penatausahaan
       GROUP BY dpa_id
     ) realPerDpa ON realPerDpa.dpa_id = d.id
     WHERE d.tahun = :tahun AND d.is_active_version = 1
       ${kodeSubKegiatan ? 'AND d.kode_sub_kegiatan = :kodeSubKegiatan' : ''}
     GROUP BY d.kode_program, d.program, d.kode_kegiatan, d.kegiatan, d.kode_sub_kegiatan, d.sub_kegiatan
     ORDER BY d.kode_sub_kegiatan ASC`,
    { replacements: { tahun: String(tahun), ...(kodeSubKegiatan ? { kodeSubKegiatan } : {}) } },
  );
  return rows.map((row) => ({
    kode_program: row.kode_program,
    program: row.program,
    kode_kegiatan: row.kode_kegiatan,
    kegiatan: row.kegiatan,
    kode_sub_kegiatan: row.kode_sub_kegiatan,
    sub_kegiatan: row.sub_kegiatan,
    anggaran_target: parseFloat(row.anggaran_target) || 0,
    anggaran_realisasi: parseFloat(row.anggaran_realisasi) || 0,
  }));
}

module.exports = { listDukunganProgramDariSistem };
