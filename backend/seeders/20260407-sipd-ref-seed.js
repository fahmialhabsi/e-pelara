/**
 * Seeder: data referensi Program & Kegiatan nomenklatur Dinas Pangan.
 * Berdasarkan nomenklatur Permendagri 90 urusan Pangan.
 */
"use strict";

module.exports = {
  async up(queryInterface) {
    // Cek apakah sudah ada data
    const existing = await queryInterface.sequelize.query(
      "SELECT COUNT(*) as cnt FROM sipd_ref_program",
      { plain: true }
    );
    if (existing.cnt > 0) {
      console.log("[seed] sipd_ref_program sudah ada data, skip");
      return;
    }

    // Insert programs
    await queryInterface.bulkInsert("sipd_ref_program", [
      { kode: "2.09.01", nama: "PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH", urusan: "Pangan", bidang_urusan: "Pangan", level: 1, aktif: true, created_at: new Date(), updated_at: new Date() },
      { kode: "2.09.02", nama: "PROGRAM PENINGKATAN DIVERSIFIKASI DAN KETAHANAN PANGAN MASYARAKAT", urusan: "Pangan", bidang_urusan: "Pangan", level: 1, aktif: true, created_at: new Date(), updated_at: new Date() },
      { kode: "2.09.03", nama: "PROGRAM PENANGANAN KERAWANAN PANGAN", urusan: "Pangan", bidang_urusan: "Pangan", level: 1, aktif: true, created_at: new Date(), updated_at: new Date() },
      { kode: "2.09.04", nama: "PROGRAM PENGAWASAN KEAMANAN PANGAN", urusan: "Pangan", bidang_urusan: "Pangan", level: 1, aktif: true, created_at: new Date(), updated_at: new Date() },
    ]);

    // Ambil ID yang baru di-insert
    const [programs] = await queryInterface.sequelize.query(
      "SELECT id, kode FROM sipd_ref_program ORDER BY kode"
    );
    const progMap = {};
    for (const p of programs) progMap[p.kode] = p.id;

    // Insert kegiatan
    await queryInterface.bulkInsert("sipd_ref_kegiatan", [
      // 2.09.01 — Penunjang
      { program_id: progMap["2.09.01"], kode: "2.09.01.2.01", nama: "Perencanaan, Penganggaran, dan Evaluasi Kinerja Perangkat Daerah", aktif: true, created_at: new Date(), updated_at: new Date() },
      { program_id: progMap["2.09.01"], kode: "2.09.01.2.02", nama: "Administrasi Keuangan Perangkat Daerah", aktif: true, created_at: new Date(), updated_at: new Date() },
      { program_id: progMap["2.09.01"], kode: "2.09.01.2.05", nama: "Administrasi Kepegawaian Perangkat Daerah", aktif: true, created_at: new Date(), updated_at: new Date() },
      { program_id: progMap["2.09.01"], kode: "2.09.01.2.06", nama: "Administrasi Umum Perangkat Daerah", aktif: true, created_at: new Date(), updated_at: new Date() },
      { program_id: progMap["2.09.01"], kode: "2.09.01.2.08", nama: "Penyediaan Jasa Penunjang Urusan Pemerintahan Daerah", aktif: true, created_at: new Date(), updated_at: new Date() },
      // 2.09.02 — Ketahanan Pangan
      { program_id: progMap["2.09.02"], kode: "2.09.02.2.01", nama: "Penyediaan dan Penyaluran Pangan Pokok atau Pangan Lainnya", aktif: true, created_at: new Date(), updated_at: new Date() },
      { program_id: progMap["2.09.02"], kode: "2.09.02.2.02", nama: "Pengelolaan dan Keseimbangan Cadangan Pangan", aktif: true, created_at: new Date(), updated_at: new Date() },
      { program_id: progMap["2.09.02"], kode: "2.09.02.2.03", nama: "Pemantauan Stok, Pasokan, dan Harga Pangan", aktif: true, created_at: new Date(), updated_at: new Date() },
      // 2.09.03 — Kerawanan
      { program_id: progMap["2.09.03"], kode: "2.09.03.2.01", nama: "Penyusunan Peta Kerentanan dan Ketahanan Pangan", aktif: true, created_at: new Date(), updated_at: new Date() },
      { program_id: progMap["2.09.03"], kode: "2.09.03.2.02", nama: "Penanganan Kerawanan Pangan Kewenangan Daerah Kabupaten/Kota", aktif: true, created_at: new Date(), updated_at: new Date() },
      // 2.09.04 — Keamanan Pangan
      { program_id: progMap["2.09.04"], kode: "2.09.04.2.01", nama: "Pelaksanaan Pengawasan Keamanan Pangan Segar Daerah", aktif: true, created_at: new Date(), updated_at: new Date() },
    ]);

    console.log("[seed] ✅ sipd_ref_program + sipd_ref_kegiatan di-seed");
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("sipd_ref_kegiatan", null, {});
    await queryInterface.bulkDelete("sipd_ref_program", null, {});
  },
};
