"use strict";

/**
 * Tambah kolom realisasi anggaran (Rp) ke Renstra, sumber datanya dari
 * modul Penatausahaan (import OCR SIPD). Mirroring persis kolom pagu_tahun_1..6
 * yang sudah ada di kedua tabel ini — realisasi_tahun_N dihitung/di-sync oleh
 * renstraRealisasiAnggaranSyncService.js, bukan diisi manual lewat form.
 */

const REALISASI_TAHUN_COLUMNS = (Sequelize, precision) => ({
  realisasi_tahun_1: { type: Sequelize.DECIMAL(...precision), defaultValue: 0 },
  realisasi_tahun_2: { type: Sequelize.DECIMAL(...precision), defaultValue: 0 },
  realisasi_tahun_3: { type: Sequelize.DECIMAL(...precision), defaultValue: 0 },
  realisasi_tahun_4: { type: Sequelize.DECIMAL(...precision), defaultValue: 0 },
  realisasi_tahun_5: { type: Sequelize.DECIMAL(...precision), defaultValue: 0 },
  realisasi_tahun_6: { type: Sequelize.DECIMAL(...precision), defaultValue: 0 },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    const subKegiatanCols = REALISASI_TAHUN_COLUMNS(Sequelize, [20, 2]);
    for (const [name, def] of Object.entries(subKegiatanCols)) {
      await queryInterface.addColumn("renstra_tabel_subkegiatan", name, def);
    }
    await queryInterface.addColumn("renstra_tabel_subkegiatan", "realisasi_akhir_renstra", {
      type: Sequelize.DECIMAL(20, 2),
      defaultValue: 0,
    });
    await queryInterface.addColumn("renstra_tabel_subkegiatan", "realisasi_synced_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    const cacheCols = REALISASI_TAHUN_COLUMNS(Sequelize, [18, 2]);
    for (const [name, def] of Object.entries(cacheCols)) {
      await queryInterface.addColumn("renstra_pagu_cache", name, def);
    }
    await queryInterface.addColumn("renstra_pagu_cache", "realisasi_akhir_renstra", {
      type: Sequelize.DECIMAL(20, 2),
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    const columns = [
      "realisasi_tahun_1",
      "realisasi_tahun_2",
      "realisasi_tahun_3",
      "realisasi_tahun_4",
      "realisasi_tahun_5",
      "realisasi_tahun_6",
      "realisasi_akhir_renstra",
    ];

    for (const name of columns) {
      await queryInterface.removeColumn("renstra_tabel_subkegiatan", name);
    }
    await queryInterface.removeColumn("renstra_tabel_subkegiatan", "realisasi_synced_at");

    for (const name of columns) {
      await queryInterface.removeColumn("renstra_pagu_cache", name);
    }
  },
};
