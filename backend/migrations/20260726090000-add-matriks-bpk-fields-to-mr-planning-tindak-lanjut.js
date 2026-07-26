"use strict";

/**
 * Menyelaraskan MrPlanningTindakLanjut dengan format resmi "MATRIKS
 * PEMANTAUAN TINDAK LANJUT HASIL PEMERIKSAAN BPK RI PERWAKILAN MALUKU UTARA"
 * (Inspektorat Provinsi Maluku Utara):
 * - status_matriks: kolom "Status" (N=belum, Ad=ada tindak lanjut).
 * - status_spj: kolom "SPJ" di bawah Status (N=belum, Ad=ada bukti SPJ).
 * - daftar_dokumen_pendukung: kolom "Rencana Aksi" — daftar dokumen
 *   pendukung bernomor, 1 baris = 1 dokumen (bukan rencana tindak lanjut ke
 *   depan — itu sudah ada sebagai rencana_tindak_lanjut_berikutnya).
 * - keterangan: kolom "Ket".
 * Kolom "Sisa" TIDAK ditambahkan sebagai kolom fisik — dihitung di query
 * laporan dari nilai_temuan_rupiah dikurangi total nilai_setoran_rupiah,
 * supaya tidak ada nilai turunan yang bisa stale.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("mr_planning_tindak_lanjut", "status_matriks", {
      type: Sequelize.ENUM("belum", "ada"),
      allowNull: true,
    });

    await queryInterface.addColumn("mr_planning_tindak_lanjut", "status_spj", {
      type: Sequelize.ENUM("belum", "ada"),
      allowNull: true,
    });

    await queryInterface.addColumn("mr_planning_tindak_lanjut", "daftar_dokumen_pendukung", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("mr_planning_tindak_lanjut", "keterangan", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("mr_planning_tindak_lanjut", "keterangan");
    await queryInterface.removeColumn("mr_planning_tindak_lanjut", "daftar_dokumen_pendukung");
    await queryInterface.removeColumn("mr_planning_tindak_lanjut", "status_spj");
    await queryInterface.removeColumn("mr_planning_tindak_lanjut", "status_matriks");

    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === "postgres") {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_mr_planning_tindak_lanjut_status_matriks";',
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_mr_planning_tindak_lanjut_status_spj";',
      );
    }
  },
};
