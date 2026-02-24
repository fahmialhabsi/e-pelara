"use strict";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.renameColumn(
      "kegiatan",
      "jenisDokumen",
      "jenis_dokumen"
    );
  },

  down: async (queryInterface) => {
    await queryInterface.renameColumn(
      "kegiatan",
      "jenis_dokumen",
      "jenisDokumen"
    );
  },
};
