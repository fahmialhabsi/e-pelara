"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "indikator",
      "jenisDokumen",
      "jenis_dokumen"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "indikator",
      "jenis_dokumen",
      "jenisDokumen"
    );
  },
};
