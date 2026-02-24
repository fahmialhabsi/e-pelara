"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("program", "opd_penanggung_jawab", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("program", "bidang_opd_penanggung_jawab", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("program", "opd_penanggung_jawab");
    await queryInterface.removeColumn("program", "bidang_opd_penanggung_jawab");
  },
};
