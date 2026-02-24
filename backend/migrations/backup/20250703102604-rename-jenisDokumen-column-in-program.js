"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn(
      "program",
      "jenisDokumen",
      "jenis_dokumen"
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn(
      "program",
      "jenis_dokumen",
      "jenisDokumen"
    );
  },
};
