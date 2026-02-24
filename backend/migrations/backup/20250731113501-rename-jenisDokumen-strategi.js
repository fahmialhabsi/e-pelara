"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("strategi");

    if (table.jenisDokumen && !table.jenis_dokumen) {
      await queryInterface.renameColumn(
        "strategi",
        "jenisDokumen",
        "jenis_dokumen"
      );
    } else {
      console.log(
        "ℹ️ Tidak ada kolom 'jenisDokumen' yang perlu di-rename. Dilewati."
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("strategi");

    if (table.jenis_dokumen && !table.jenisDokumen) {
      await queryInterface.renameColumn(
        "strategi",
        "jenis_dokumen",
        "jenisDokumen"
      );
    } else {
      console.log(
        "ℹ️ Tidak ada kolom 'jenis_dokumen' yang perlu di-rename ulang. Dilewati."
      );
    }
  },
};
