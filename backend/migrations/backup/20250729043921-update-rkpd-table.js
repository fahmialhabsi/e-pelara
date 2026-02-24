"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Rename kolom
    await queryInterface.renameColumn(
      "rkpd",
      "opd_penanggung_jawab_id",
      "opd_id"
    );
    await queryInterface.renameColumn("rkpd", "arah_kebijakan_id", "arah_id");
    await queryInterface.renameColumn(
      "rkpd",
      "prioritas_kepala_daerah_id",
      "prioritas_gubernur_id"
    );

    // Tambahkan kolom baru
    await queryInterface.addColumn("rkpd", "visi_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn("rkpd", "misi_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Rollback penambahan kolom
    await queryInterface.removeColumn("rkpd", "visi_id");
    await queryInterface.removeColumn("rkpd", "misi_id");

    // Rollback penggantian nama kolom
    await queryInterface.renameColumn(
      "rkpd",
      "opd_id",
      "opd_penanggung_jawab_id"
    );
    await queryInterface.renameColumn("rkpd", "arah_id", "arah_kebijakan_id");
    await queryInterface.renameColumn(
      "rkpd",
      "prioritas_gubernur_id",
      "prioritas_kepala_daerah_id"
    );
  },
};
