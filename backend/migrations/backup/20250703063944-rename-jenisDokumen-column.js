"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.renameColumn(
      "sub_kegiatan",
      "jenisDokumen",
      "jenis_dokumen"
    );
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.renameColumn(
      "sub_kegiatan",
      "jenis_dokumen",
      "jenisDokumen"
    );
  },
};
