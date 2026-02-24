"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.renameColumn(
      "tujuan",
      "jenisDokumen",
      "jenis_dokumen"
    );
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.renameColumn(
      "tujuan",
      "jenis_dokumen",
      "jenisDokumen"
    );
  },
};
