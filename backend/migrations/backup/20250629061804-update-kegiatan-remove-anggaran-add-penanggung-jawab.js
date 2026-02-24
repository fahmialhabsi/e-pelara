"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("kegiatan", "anggaran");
    await queryInterface.addColumn("kegiatan", "opd_penanggung_jawab", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("kegiatan", "bidang_opd_penanggung_jawab", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("kegiatan", "anggaran", {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
    });
    await queryInterface.removeColumn("kegiatan", "opd_penanggung_jawab");
    await queryInterface.removeColumn(
      "kegiatan",
      "bidang_opd_penanggung_jawab"
    );
  },
};
