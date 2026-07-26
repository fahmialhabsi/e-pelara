"use strict";

/**
 * Surat Pengantar (transmittal letter) dari Inspektorat yang menyampaikan
 * Matriks Pemantauan TLHP ke SKPD — dokumen ini BERBEDA dari Surat Tugas
 * pemeriksaan (surat_tugas_nomor/surat_tugas_tanggal yang sudah ada, itu
 * surat penugasan tim pemeriksa, bukan surat pengantar distribusi matriks).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("mr_planning_lhp", "nomor_surat_pengantar", {
      type: Sequelize.STRING(150),
      allowNull: true,
    });

    await queryInterface.addColumn("mr_planning_lhp", "tanggal_surat_pengantar", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn("mr_planning_lhp", "perihal_surat_pengantar", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("mr_planning_lhp", "perihal_surat_pengantar");
    await queryInterface.removeColumn("mr_planning_lhp", "tanggal_surat_pengantar");
    await queryInterface.removeColumn("mr_planning_lhp", "nomor_surat_pengantar");
  },
};
