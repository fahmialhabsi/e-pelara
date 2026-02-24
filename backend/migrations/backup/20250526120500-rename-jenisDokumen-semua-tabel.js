"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "indikatorkegiatans",
      "jenisDokumen",
      "jenis_dokumen"
    );
    await queryInterface.renameColumn(
      "indikatorprograms",
      "jenisDokumen",
      "jenis_dokumen"
    );
    await queryInterface.renameColumn(
      "indikatorsasarans",
      "jenisDokumen",
      "jenis_dokumen"
    );
    await queryInterface.renameColumn(
      "indikatortujuans",
      "jenisDokumen",
      "jenis_dokumen"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "indikatorkegiatans",
      "jenis_dokumen",
      "jenisDokumen"
    );
    await queryInterface.renameColumn(
      "indikatorprograms",
      "jenis_dokumen",
      "jenisDokumen"
    );
    await queryInterface.renameColumn(
      "indikatorsasarans",
      "jenis_dokumen",
      "jenisDokumen"
    );
    await queryInterface.renameColumn(
      "indikatortujuans",
      "jenis_dokumen",
      "jenisDokumen"
    );
  },
};
