"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("sub_kegiatan", "sub_bidang_opd", {
      type: Sequelize.STRING(255),
      allowNull: false,
      after: "nama_bidang_opd", // opsional, hanya untuk MySQL
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("sub_kegiatan", "sub_bidang_opd");
  },
};
