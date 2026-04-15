"use strict";

/**
 * Migration: tambah kolom kode_rekening dan nama_rekening ke tabel dpa.
 * Backward compatible — kedua kolom nullable.
 * Referensi ke tabel kode_rekening (Permendagri 90) bersifat soft/logical
 * (tidak FK constraint) untuk menjaga kompatibilitas data lama.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("dpa");

    if (!table.kode_rekening) {
      await queryInterface.addColumn("dpa", "kode_rekening", {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: null,
        comment: "Referensi kode rekening Permendagri 90 (soft ref ke tabel kode_rekening)",
        after: "anggaran",
      });
    }

    if (!table.nama_rekening) {
      await queryInterface.addColumn("dpa", "nama_rekening", {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: "Denormalisasi nama rekening untuk display cepat",
        after: "kode_rekening",
      });
    }

    // Index untuk pencarian cepat per kode rekening
    try {
      await queryInterface.addIndex("dpa", ["kode_rekening"], {
        name: "dpa_kode_rekening_idx",
      });
    } catch (_) {
      // Index mungkin sudah ada
    }
  },

  async down(queryInterface) {
    try { await queryInterface.removeIndex("dpa", "dpa_kode_rekening_idx"); } catch (_) {}
    try { await queryInterface.removeColumn("dpa", "nama_rekening"); } catch (_) {}
    try { await queryInterface.removeColumn("dpa", "kode_rekening"); } catch (_) {}
  },
};
