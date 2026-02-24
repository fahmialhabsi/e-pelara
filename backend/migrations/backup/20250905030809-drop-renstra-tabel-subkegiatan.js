"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("renstra_tabel_subkegiatan");
  },

  down: async (queryInterface, Sequelize) => {
    // Opsional: jika ingin rollback, bisa recreate table di sini
  },
};
