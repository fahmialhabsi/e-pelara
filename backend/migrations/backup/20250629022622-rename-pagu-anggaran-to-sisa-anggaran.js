"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "sub_kegiatan",
      "pagu_anggaran",
      "sisa_anggaran"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "sub_kegiatan",
      "sisa_anggaran",
      "pagu_anggaran"
    );
  },
};
