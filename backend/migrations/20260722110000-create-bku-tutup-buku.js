"use strict";

/**
 * Fase 2 perbaikan BKU: mekanisme tutup buku bulanan sesuai Permendagri
 * 13/2006 jo 77/2020 — Bendahara menutup BKU tiap akhir bulan, diperiksa
 * & disetujui PPK-SKPD/PA sebelum bulan tsb terkunci dari perubahan.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("bku_tutup_buku", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      bulan: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM("BELUM_TUTUP", "DITUTUP", "DISETUJUI"),
        defaultValue: "BELUM_TUTUP",
      },
      saldo_awal: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      total_penerimaan: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      total_pengeluaran: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      saldo_akhir: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      ditutup_oleh: { type: Sequelize.INTEGER, allowNull: true },
      ditutup_at: { type: Sequelize.DATE, allowNull: true },
      disetujui_oleh: { type: Sequelize.INTEGER, allowNull: true },
      disetujui_at: { type: Sequelize.DATE, allowNull: true },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.addIndex("bku_tutup_buku", ["tahun_anggaran", "bulan"], {
      name: "idx_bku_tutup_buku_tahun_bulan",
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("bku_tutup_buku").catch(() => {});
  },
};
